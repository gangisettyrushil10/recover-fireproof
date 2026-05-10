/**
 * EvidenceValidationService
 *
 *   - `validate(itemId)`: runs the per-type validator, persists the result,
 *     emits an audit event.
 *   - `validateForClose(exceptionId)`: pulls the latest rule_evaluation for
 *     the exception and reports any blocking requirement that does not have
 *     a corresponding `<evidence_type>.valid` evidence_item.
 */

import { and, desc, eq } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import { notFound } from '@fireproof/domain';
import type { EvidenceStatus, EvidenceType } from '@fireproof/domain';
import { validateByType, type ValidationError } from './evidence-validators/index.js';
import type { AuditEventService } from './AuditEventService.js';

export interface CloseValidationResult {
  ok: boolean;
  missing: string[];
}

export class EvidenceValidationService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditEventService,
  ) {}

  async validate(
    organization_id: string,
    evidence_item_id: string,
    actorUserId: string | null,
  ): Promise<typeof schema.evidence_items.$inferSelect> {
    const rows = await this.db
      .select()
      .from(schema.evidence_items)
      .where(
        and(
          eq(schema.evidence_items.id, evidence_item_id),
          eq(schema.evidence_items.organization_id, organization_id),
        ),
      )
      .limit(1);
    const item = rows[0];
    if (!item) throw notFound('evidence_item', evidence_item_id);

    const outcome = validateByType(
      item.evidence_type as EvidenceType,
      (item.payload as unknown) ?? {},
    );

    const nextStatus: EvidenceStatus = outcome.valid ? 'valid' : 'insufficient';
    const errors: ValidationError[] = outcome.errors;

    const [updated] = await this.db
      .update(schema.evidence_items)
      .set({
        status: nextStatus,
        validated_at: new Date(),
        validation_errors_json: errors,
        updated_at: new Date(),
      })
      .where(eq(schema.evidence_items.id, evidence_item_id))
      .returning();
    if (!updated) throw new Error('EvidenceValidationService.validate: update returned no rows');

    await this.audit.log({
      organization_id,
      action: 'evidence.upserted',
      entity_type: 'evidence_item',
      entity_id: updated.id,
      related_kind: 'exception',
      related_id: updated.exception_id,
      actor_user_id: actorUserId,
      before: { status: item.status },
      after: { status: nextStatus, errors },
      detail: { evidence_type: updated.evidence_type, valid: outcome.valid },
    });
    return updated;
  }

  /**
   * Compute "what would block closing this exception right now?"
   *
   * Reads the latest rule_evaluation for the exception. For each blocking
   * requirement, checks that an evidence_item with matching evidence_type
   * exists with status=valid.
   */
  async validateForClose(
    organization_id: string,
    exception_id: string,
  ): Promise<CloseValidationResult> {
    const evals = await this.db
      .select()
      .from(schema.rule_evaluations)
      .where(
        and(
          eq(schema.rule_evaluations.organization_id, organization_id),
          eq(schema.rule_evaluations.exception_id, exception_id),
        ),
      )
      .orderBy(desc(schema.rule_evaluations.evaluated_at))
      .limit(1);
    const evalRow = evals[0];

    // No evaluation yet → nothing blocks. (Service layer SHOULD ensure one
    // gets run on creation, but failing-open here matches the contract.)
    if (!evalRow) return { ok: true, missing: [] };

    const items = await this.db
      .select()
      .from(schema.evidence_items)
      .where(
        and(
          eq(schema.evidence_items.organization_id, organization_id),
          eq(schema.evidence_items.exception_id, exception_id),
        ),
      );
    const validByType = new Set(
      items.filter((i) => i.status === 'valid').map((i) => i.evidence_type),
    );

    const blocking = (evalRow.blocking_json ?? []) as Array<{
      evidence_type: EvidenceType;
      key?: string;
      blocking?: boolean;
      satisfied?: boolean;
    }>;

    const missing: string[] = [];
    for (const req of blocking) {
      if (!validByType.has(req.evidence_type)) {
        missing.push(`${req.evidence_type}.valid`);
      }
    }
    return { ok: missing.length === 0, missing };
  }
}

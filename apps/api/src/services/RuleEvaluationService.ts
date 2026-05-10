/**
 * Thin wrapper around the rules engine. The engine itself lives in
 * `@fireproof/rules`; here we only resolve the right rule pack and
 * persist the evaluation snapshot.
 *
 * The rules package may not be wired yet — this service uses dynamic
 * lookup with a graceful fallback so the API still boots and tests can
 * stub the engine.
 */

import { and, desc, eq } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import {
  notFound,
  type EvidenceStatus,
  type EvidenceType,
  type ExceptionType,
} from '@fireproof/domain';
import type { AuditEventService } from './AuditEventService.js';

export interface EvaluatedRequirement {
  key: string;
  evidence_type: EvidenceType;
  status: EvidenceStatus;
  required: boolean;
  blocking: boolean;
  satisfied: boolean;
  reason?: string | null;
  detail?: Record<string, unknown>;
}

interface EngineLike {
  evaluate(input: {
    exceptionType: ExceptionType;
    rulePack: Record<string, unknown> | null;
    exception: Record<string, unknown>;
    property: Record<string, unknown> | null;
    jurisdiction: Record<string, unknown> | null;
    evidence: Record<string, unknown>[];
  }): { requirements: EvaluatedRequirement[]; is_satisfied: boolean };
}

export class RuleEvaluationService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditEventService,
    private readonly engine: EngineLike | null = null,
  ) {}

  async run(
    organization_id: string,
    exception_id: string,
    actorUserId: string | null,
  ): Promise<typeof schema.rule_evaluations.$inferSelect> {
    const exRows = await this.db
      .select()
      .from(schema.exceptions)
      .where(
        and(
          eq(schema.exceptions.id, exception_id),
          eq(schema.exceptions.organization_id, organization_id),
        ),
      )
      .limit(1);
    const exception = exRows[0];
    if (!exception) throw notFound('exception', exception_id);

    // Resolve rule_pack: explicit on exception > most recent active for org.
    let rule_pack: typeof schema.rule_packs.$inferSelect | undefined;
    if (exception.rule_pack_id) {
      const rp = await this.db
        .select()
        .from(schema.rule_packs)
        .where(eq(schema.rule_packs.id, exception.rule_pack_id))
        .limit(1);
      rule_pack = rp[0];
    }
    if (!rule_pack) {
      const rp = await this.db
        .select()
        .from(schema.rule_packs)
        .where(
          and(
            eq(schema.rule_packs.organization_id, organization_id),
            eq(schema.rule_packs.is_active, true),
          ),
        )
        .orderBy(desc(schema.rule_packs.created_at))
        .limit(1);
      rule_pack = rp[0];
    }

    const property = exception.property_id
      ? (
          await this.db
            .select()
            .from(schema.properties)
            .where(eq(schema.properties.id, exception.property_id))
            .limit(1)
        )[0]
      : undefined;
    const jurisdiction = exception.jurisdiction_id
      ? (
          await this.db
            .select()
            .from(schema.jurisdictions)
            .where(eq(schema.jurisdictions.id, exception.jurisdiction_id))
            .limit(1)
        )[0]
      : undefined;
    const evidence = await this.db
      .select()
      .from(schema.evidence_items)
      .where(eq(schema.evidence_items.exception_id, exception_id));

    let requirements: EvaluatedRequirement[] = [];
    let is_satisfied = true;

    if (this.engine && rule_pack) {
      const out = this.engine.evaluate({
        exceptionType: exception.type as ExceptionType,
        rulePack: (rule_pack as Record<string, unknown>) ?? null,
        exception: exception as unknown as Record<string, unknown>,
        property: (property as Record<string, unknown> | undefined) ?? null,
        jurisdiction: (jurisdiction as Record<string, unknown> | undefined) ?? null,
        evidence: evidence as unknown as Record<string, unknown>[],
      });
      requirements = out.requirements;
      is_satisfied = out.is_satisfied;
    } else if (rule_pack) {
      // Fallback: read static `requirements` from rule_pack JSON.
      const declared = ((rule_pack.requirements as unknown) ?? []) as Array<{
        key: string;
        evidence_type: EvidenceType;
        exception_type?: ExceptionType;
        required?: boolean;
        blocking?: boolean;
      }>;
      const validByType = new Set(
        evidence.filter((e) => e.status === 'valid').map((e) => e.evidence_type),
      );
      requirements = declared
        .filter(
          (r) => !r.exception_type || r.exception_type === (exception.type as ExceptionType),
        )
        .map((r) => {
          const satisfied = validByType.has(r.evidence_type);
          const status: EvidenceStatus = satisfied ? 'valid' : 'missing';
          return {
            key: r.key,
            evidence_type: r.evidence_type,
            status,
            required: r.required ?? true,
            blocking: r.blocking ?? false,
            satisfied,
            detail: {},
          } satisfies EvaluatedRequirement;
        });
      is_satisfied = requirements
        .filter((r) => r.blocking && r.required)
        .every((r) => r.satisfied);
    }

    if (!rule_pack) {
      // No rule pack at all → nothing to satisfy.
      requirements = [];
      is_satisfied = true;
    }

    const blocking = requirements.filter((r) => r.blocking && !r.satisfied);

    const [row] = await this.db
      .insert(schema.rule_evaluations)
      .values({
        organization_id,
        exception_id,
        rule_pack_id: rule_pack ? rule_pack.id : '00000000-0000-0000-0000-000000000000',
        rule_binding_id: null,
        requirements_json: requirements,
        blocking_json: blocking,
        is_satisfied,
        evaluated_at: new Date(),
      })
      .returning();
    if (!row) throw new Error('RuleEvaluationService.run: insert returned no rows');

    await this.audit.log({
      organization_id,
      action: 'rule_evaluation.run',
      entity_type: 'rule_evaluation',
      entity_id: row.id,
      related_kind: 'exception',
      related_id: exception_id,
      actor_user_id: actorUserId,
      detail: {
        is_satisfied,
        blocking_count: blocking.length,
        rule_pack_id: rule_pack?.id ?? null,
      },
    });
    return row;
  }

  async getLatest(
    organization_id: string,
    exception_id: string,
  ): Promise<typeof schema.rule_evaluations.$inferSelect | undefined> {
    const rows = await this.db
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
    return rows[0];
  }
}

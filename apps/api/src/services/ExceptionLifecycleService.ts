/**
 * ExceptionLifecycleService
 *
 *   - `create(input)`: validates type-specific required fields, picks the
 *     initial state, runs rules, returns the persisted exception.
 *   - `transition(...)`: enforces `isAllowedTransition` and, on close
 *     transitions, calls EvidenceValidationService.validateForClose.
 */

import { and, eq } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import {
  blockingRequirementsUnmet,
  invalidStateTransition,
  isAllowedTransition,
  notFound,
  validationFailed,
  type ExceptionType,
} from '@fireproof/domain';
import type { AuditEventService } from './AuditEventService.js';
import type { EvidenceValidationService } from './EvidenceValidationService.js';
import type { RuleEvaluationService } from './RuleEvaluationService.js';

export interface CreateExceptionInput {
  organization_id: string;
  property_id: string;
  type: ExceptionType;
  title: string;
  severity: typeof schema.exceptions.$inferInsert['severity'];
  system_id?: string | null;
  asset_id?: string | null;
  jurisdiction_id?: string | null;
  jurisdiction_confidence?: typeof schema.exceptions.$inferInsert['jurisdiction_confidence'];
  summary?: string | null;
  due_at?: Date | null;
  assigned_user_id?: string | null;
  reporter_user_id?: string | null;
  rule_pack_id?: string | null;
  metadata?: Record<string, unknown>;
}

const INITIAL_STATE: Record<ExceptionType, string> = {
  impairment: 'draft',
  deficiency: 'detected',
  carrier_recommendation: 'imported',
  asset_identity: 'detected',
};

const CLOSE_STATES = new Set([
  'closed_audit_ready',
  'closed_verified',
  'declined_risk_accepted',
]);

export interface TransitionInput {
  organization_id: string;
  exception_id: string;
  to_state: string;
  reason?: string | null;
  actor_user_id?: string | null;
  detail?: Record<string, unknown>;
}

export class ExceptionLifecycleService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditEventService,
    private readonly evidence: EvidenceValidationService,
    private readonly rules: RuleEvaluationService,
  ) {}

  async create(input: CreateExceptionInput): Promise<typeof schema.exceptions.$inferSelect> {
    if (!INITIAL_STATE[input.type]) {
      throw validationFailed(`Unknown exception type: ${input.type}`, { type: input.type });
    }
    const initial = INITIAL_STATE[input.type];

    const [row] = await this.db
      .insert(schema.exceptions)
      .values({
        organization_id: input.organization_id,
        property_id: input.property_id,
        system_id: input.system_id ?? null,
        asset_id: input.asset_id ?? null,
        jurisdiction_id: input.jurisdiction_id ?? null,
        jurisdiction_confidence: input.jurisdiction_confidence ?? null,
        type: input.type,
        state: initial,
        severity: input.severity,
        title: input.title,
        summary: input.summary ?? null,
        rule_pack_id: input.rule_pack_id ?? null,
        assigned_user_id: input.assigned_user_id ?? null,
        reporter_user_id: input.reporter_user_id ?? null,
        opened_at: new Date(),
        due_at: input.due_at ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error('ExceptionLifecycleService.create: insert returned no rows');

    await this.db.insert(schema.exception_state_history).values({
      organization_id: input.organization_id,
      exception_id: row.id,
      from_state: null,
      to_state: initial,
      changed_by_user_id: input.reporter_user_id ?? null,
      reason: 'created',
    });

    await this.audit.log({
      organization_id: input.organization_id,
      action: 'exception.created',
      entity_type: 'exception',
      entity_id: row.id,
      actor_user_id: input.reporter_user_id ?? null,
      after: { type: input.type, state: initial, severity: input.severity },
    });

    // Compute the initial requirements snapshot. Failures are non-fatal —
    // an exception can exist before its rule pack is wired.
    try {
      await this.rules.run(input.organization_id, row.id, input.reporter_user_id ?? null);
    } catch {
      // ignore — surfaced via /v1/rule-evaluations/run
    }
    return row;
  }

  async transition(input: TransitionInput): Promise<typeof schema.exceptions.$inferSelect> {
    const rows = await this.db
      .select()
      .from(schema.exceptions)
      .where(
        and(
          eq(schema.exceptions.id, input.exception_id),
          eq(schema.exceptions.organization_id, input.organization_id),
        ),
      )
      .limit(1);
    const ex = rows[0];
    if (!ex) throw notFound('exception', input.exception_id);

    const ok = isAllowedTransition(
      ex.type as ExceptionType,
      ex.state as never,
      input.to_state as never,
    );
    if (!ok) throw invalidStateTransition(ex.type, ex.state, input.to_state);

    if (CLOSE_STATES.has(input.to_state)) {
      const result = await this.evidence.validateForClose(
        input.organization_id,
        input.exception_id,
      );
      if (!result.ok) {
        throw blockingRequirementsUnmet(result.missing, {
          exceptionId: input.exception_id,
        });
      }
    }

    const closed_at = CLOSE_STATES.has(input.to_state) ? new Date() : ex.closed_at;

    const [updated] = await this.db
      .update(schema.exceptions)
      .set({ state: input.to_state, closed_at, updated_at: new Date() })
      .where(eq(schema.exceptions.id, input.exception_id))
      .returning();
    if (!updated) throw new Error('ExceptionLifecycleService.transition: update returned no rows');

    await this.db.insert(schema.exception_state_history).values({
      organization_id: input.organization_id,
      exception_id: input.exception_id,
      from_state: ex.state,
      to_state: input.to_state,
      changed_by_user_id: input.actor_user_id ?? null,
      reason: input.reason ?? null,
      detail: input.detail ?? {},
    });

    await this.audit.log({
      organization_id: input.organization_id,
      action: 'exception.transitioned',
      entity_type: 'exception',
      entity_id: input.exception_id,
      actor_user_id: input.actor_user_id ?? null,
      before: { state: ex.state },
      after: { state: input.to_state },
      detail: { reason: input.reason ?? null },
    });

    return updated;
  }

  async get(
    organization_id: string,
    id: string,
  ): Promise<typeof schema.exceptions.$inferSelect> {
    const rows = await this.db
      .select()
      .from(schema.exceptions)
      .where(
        and(
          eq(schema.exceptions.id, id),
          eq(schema.exceptions.organization_id, organization_id),
        ),
      )
      .limit(1);
    const ex = rows[0];
    if (!ex) throw notFound('exception', id);
    return ex;
  }

  async listByProperty(
    organization_id: string,
    property_id: string,
  ): Promise<(typeof schema.exceptions.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.exceptions)
      .where(
        and(
          eq(schema.exceptions.organization_id, organization_id),
          eq(schema.exceptions.property_id, property_id),
        ),
      );
  }

  async listAll(
    organization_id: string,
    filters: { property_id?: string; severity?: string; type?: string } = {},
  ): Promise<(typeof schema.exceptions.$inferSelect)[]> {
    const where = [eq(schema.exceptions.organization_id, organization_id)];
    if (filters.property_id) where.push(eq(schema.exceptions.property_id, filters.property_id));
    if (filters.severity)
      where.push(
        eq(
          schema.exceptions.severity,
          filters.severity as typeof schema.exceptions.$inferSelect['severity'],
        ),
      );
    if (filters.type)
      where.push(
        eq(
          schema.exceptions.type,
          filters.type as typeof schema.exceptions.$inferSelect['type'],
        ),
      );
    return this.db
      .select()
      .from(schema.exceptions)
      .where(and(...where));
  }
}

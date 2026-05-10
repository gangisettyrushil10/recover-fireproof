/**
 * Legal-hold lifecycle: issue, release, and the predicates that other
 * services consult before mutating originals or scoped subjects.
 *
 * Active holds win — supersession or deletion of any in-scope subject is
 * rejected with `LEGAL_HOLD_ACTIVE`.
 */

import { and, eq, sql } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import { DomainError, DomainErrorCode } from '@fireproof/domain';
import type { AuditEventService } from './AuditEventService.js';

export interface CreateLegalHoldInput {
  organization_id: string;
  scope_type: 'property' | 'exception' | 'packet' | 'document' | 'document_version';
  scope_id: string;
  reason: string;
  requested_by_user_id?: string | null;
  name?: string;
  metadata?: Record<string, unknown>;
}

export class LegalHoldService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditEventService,
  ) {}

  async create(input: CreateLegalHoldInput): Promise<typeof schema.legal_holds.$inferSelect> {
    const [row] = await this.db
      .insert(schema.legal_holds)
      .values({
        organization_id: input.organization_id,
        scope_type: input.scope_type,
        scope_id: input.scope_id,
        reason: input.reason,
        requested_by_user_id: input.requested_by_user_id ?? null,
        name: input.name ?? `Hold on ${input.scope_type}/${input.scope_id}`,
        status: 'active',
        issued_at: new Date(),
        effective_at: new Date(),
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error('LegalHoldService.create: insert returned no rows');

    await this.audit.log({
      organization_id: input.organization_id,
      action: 'legal_hold.issued',
      entity_type: 'legal_hold',
      entity_id: row.id,
      actor_user_id: input.requested_by_user_id ?? null,
      detail: { scope_type: input.scope_type, scope_id: input.scope_id, reason: input.reason },
    });
    return row;
  }

  async release(
    id: string,
    organization_id: string,
    actorUserId: string | null,
    reason: string,
  ): Promise<typeof schema.legal_holds.$inferSelect> {
    const [row] = await this.db
      .update(schema.legal_holds)
      .set({
        status: 'released',
        released_at: new Date(),
        released_by_user_id: actorUserId,
        release_reason: reason,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(schema.legal_holds.id, id),
          eq(schema.legal_holds.organization_id, organization_id),
        ),
      )
      .returning();
    if (!row) {
      throw new DomainError(DomainErrorCode.NotFound, `legal_hold ${id} not found`);
    }
    await this.audit.log({
      organization_id,
      action: 'legal_hold.released',
      entity_type: 'legal_hold',
      entity_id: row.id,
      actor_user_id: actorUserId,
      detail: { reason },
    });
    return row;
  }

  /**
   * True if any active hold covers this scope. Looks at both the primary
   * scope_type/scope_id and the JSONB `subjects` array.
   */
  async isScopeUnderHold(
    organization_id: string,
    scope_type: string,
    scope_id: string,
  ): Promise<boolean> {
    const rows = await this.db.execute<{ id: string }>(sql`
      SELECT id FROM legal_holds
       WHERE organization_id = ${organization_id}
         AND status = 'active'
         AND (
              (scope_type = ${scope_type} AND scope_id = ${scope_id}::uuid)
              OR subjects @> ${JSON.stringify([{ kind: scope_type, id: scope_id }])}::jsonb
         )
       LIMIT 1
    `);
    return rows.rows.length > 0;
  }

  async list(
    organization_id: string,
    filters: { scope_type?: string; scope_id?: string },
  ): Promise<(typeof schema.legal_holds.$inferSelect)[]> {
    const where = [eq(schema.legal_holds.organization_id, organization_id)];
    if (filters.scope_type) where.push(eq(schema.legal_holds.scope_type, filters.scope_type));
    if (filters.scope_id) where.push(eq(schema.legal_holds.scope_id, filters.scope_id));
    return this.db
      .select()
      .from(schema.legal_holds)
      .where(and(...where))
      .orderBy(schema.legal_holds.created_at);
  }
}

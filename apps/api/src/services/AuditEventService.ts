/**
 * Append-only audit log writer. Every state-changing service path calls
 * `AuditEventService.log({...})`. Reads never write here.
 */

import { schema, type Database } from '@fireproof/db';
import type { AuditAction } from '@fireproof/domain';

export interface AuditLogInput {
  organization_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  related_kind?: string | null;
  related_id?: string | null;
  actor_user_id?: string | null;
  is_system_actor?: boolean;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  detail?: Record<string, unknown>;
  request_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

export class AuditEventService {
  constructor(private readonly db: Database) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.db.insert(schema.audit_events).values({
      organization_id: input.organization_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      related_kind: input.related_kind ?? null,
      related_id: input.related_id ?? null,
      actor_user_id: input.actor_user_id ?? null,
      is_system_actor: input.is_system_actor ?? false,
      before_json: input.before ?? null,
      after_json: input.after ?? null,
      detail: input.detail ?? {},
      request_id: input.request_id ?? null,
      ip: input.ip ?? null,
      user_agent: input.user_agent ?? null,
    });
  }
}

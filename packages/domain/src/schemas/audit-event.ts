import { z } from 'zod';
import {
  EntityRefSchema,
  IsoDateTimeSchema,
  MetadataSchema,
} from './_primitives.js';
import {
  AuditEventIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

/**
 * Append-only audit log. Every state change, evidence change, hold change,
 * and packet emission MUST append a row here. Records are never updated.
 */
export const AuditActionValues = [
  'exception.created',
  'exception.transitioned',
  'exception.assigned',
  'exception.severity_changed',
  'exception.hold_status_changed',
  'evidence.upserted',
  'evidence.waived',
  'evidence.cleared',
  'document.created',
  'document_version.created',
  'document_version.superseded',
  'document_claim.created',
  'rule_evaluation.run',
  'contradiction.detected',
  'contradiction.resolved',
  'packet.created',
  'packet.emitted',
  'legal_hold.issued',
  'legal_hold.released',
  'notification.sent',
  'notification.failed',
  'user.signed_in',
  'user.role_changed',
] as const;
export type AuditAction = (typeof AuditActionValues)[number];

export const AuditEventSchema = z.object({
  id: AuditEventIdSchema,
  organization_id: OrganizationIdSchema,
  action: z.enum(AuditActionValues),
  /** What changed. */
  subject_ref: EntityRefSchema,
  /** Optional secondary subject (e.g., the new state, the document version). */
  related_ref: EntityRefSchema.nullable().optional(),
  actor_user_id: UserIdSchema.nullable().optional(),
  /** True if performed by a system/integration rather than a human. */
  is_system_actor: z.boolean().default(false),
  /** Free-form structured detail (e.g., from/to state, unmet requirements). */
  detail: z.record(z.string(), z.unknown()).default({}),
  /** Optional request-scoped correlation id. */
  request_id: z.string().nullable().optional(),
  occurred_at: IsoDateTimeSchema,
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

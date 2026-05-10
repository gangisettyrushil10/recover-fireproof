import { z } from 'zod';
import {
  AuditActionValues,
  AuditEventSchema,
} from '../schemas/audit-event.js';
import { paginated, PaginationRequestSchema } from './_common.js';
import {
  EntityRefKindValues,
  IsoDateTimeSchema,
} from '../schemas/_primitives.js';

// ─── GET /v1/audit-events ───────────────────────────────────────────────────

export const ListAuditEventsQuerySchema = PaginationRequestSchema.extend({
  action: z.enum(AuditActionValues).optional(),
  subject_kind: z.enum(EntityRefKindValues).optional(),
  subject_id: z.string().uuid().optional(),
  actor_user_id: z.string().uuid().optional(),
  occurred_after: IsoDateTimeSchema.optional(),
  occurred_before: IsoDateTimeSchema.optional(),
});
export type ListAuditEventsQuery = z.infer<typeof ListAuditEventsQuerySchema>;

export const ListAuditEventsResponseSchema = paginated(AuditEventSchema);
export type ListAuditEventsResponse = z.infer<typeof ListAuditEventsResponseSchema>;

import { z } from 'zod';
import {
  NotificationChannelValues,
  NotificationStatusValues,
} from '../enums.js';
import {
  EntityRefSchema,
  IsoDateTimeSchema,
  MetadataSchema,
} from './_primitives.js';
import {
  NotificationIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  organization_id: OrganizationIdSchema,
  channel: z.enum(NotificationChannelValues),
  status: z.enum(NotificationStatusValues).default('queued'),
  /** What this notification is about. */
  subject_ref: EntityRefSchema,
  recipient_user_id: UserIdSchema.nullable().optional(),
  recipient_address: z.string().min(1),
  template_key: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  sent_at: IsoDateTimeSchema.nullable().optional(),
  delivered_at: IsoDateTimeSchema.nullable().optional(),
  failed_at: IsoDateTimeSchema.nullable().optional(),
  failure_reason: z.string().nullable().optional(),
  /** External provider message id, if any. */
  external_id: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

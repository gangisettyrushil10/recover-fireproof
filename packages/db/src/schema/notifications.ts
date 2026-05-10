import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { exceptions } from './exceptions.js';
import { users } from './users.js';
import {
  notificationChannelEnum,
  notificationStatusEnum,
} from './_enums.js';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    exception_id: uuid('exception_id').references(() => exceptions.id, {
      onDelete: 'set null',
    }),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    recipient_role: text('recipient_role'),
    recipient_user_id: uuid('recipient_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    recipient_address: text('recipient_address'),
    template_key: text('template_key'),
    payload_hash: text('payload_hash'),
    payload: jsonb('payload').notNull().default('{}'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    failed_at: timestamp('failed_at', { withTimezone: true }),
    failure_reason: text('failure_reason'),
    external_id: text('external_id'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    notifications_exception_idx: index('notifications_exception_idx').on(t.exception_id),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

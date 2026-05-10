import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations.js';
import { users } from './users.js';
import { auditActionEnum } from './_enums.js';

/**
 * Append-only audit log. Every state change, evidence change, hold change,
 * and packet emission MUST append a row here. Records are never updated.
 */
export const audit_events = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    action: auditActionEnum('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: uuid('entity_id'),
    related_kind: text('related_kind'),
    related_id: uuid('related_id'),
    actor_user_id: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    is_system_actor: boolean('is_system_actor').notNull().default(false),
    before_json: jsonb('before_json'),
    after_json: jsonb('after_json'),
    detail: jsonb('detail').notNull().default('{}'),
    request_id: text('request_id'),
    ip: text('ip'),
    user_agent: text('user_agent'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    audit_events_entity_idx: index('audit_events_entity_idx').on(
      t.entity_type,
      t.entity_id,
      sql`${t.created_at} DESC`,
    ),
    audit_events_actor_idx: index('audit_events_actor_idx').on(t.actor_user_id),
  }),
);

export type AuditEventRow = typeof audit_events.$inferSelect;
export type AuditEventInsert = typeof audit_events.$inferInsert;

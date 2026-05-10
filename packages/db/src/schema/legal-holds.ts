import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';
import { holdStatusEnum } from './_enums.js';

/**
 * A legal hold has a primary scope (kind/id) plus an optional `subjects`
 * JSON array for compound/multi-subject holds. While `status='active'`,
 * supersession or deletion of in-scope items is forbidden.
 */
export const legal_holds = pgTable(
  'legal_holds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull().default('Legal hold'),
    scope_type: text('scope_type').notNull(),
    scope_id: uuid('scope_id'),
    reason: text('reason').notNull(),
    status: holdStatusEnum('status').notNull().default('active'),
    subjects: jsonb('subjects').notNull().default('[]'),
    requested_by_user_id: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    issued_by_user_id: uuid('issued_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    issued_at: timestamp('issued_at', { withTimezone: true }),
    effective_at: timestamp('effective_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    released_by_user_id: uuid('released_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    released_at: timestamp('released_at', { withTimezone: true }),
    release_reason: text('release_reason'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    legal_holds_scope_idx: index('legal_holds_scope_idx').on(
      t.scope_type,
      t.scope_id,
      t.status,
    ),
  }),
);

export type LegalHoldRow = typeof legal_holds.$inferSelect;
export type LegalHoldInsert = typeof legal_holds.$inferInsert;

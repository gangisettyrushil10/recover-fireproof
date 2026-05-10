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

/**
 * Append-only history of every state change. Service code MUST NOT update
 * or delete rows here — see CLAUDE.md.
 */
export const exception_state_history = pgTable(
  'exception_state_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    exception_id: uuid('exception_id')
      .notNull()
      .references(() => exceptions.id, { onDelete: 'cascade' }),
    from_state: text('from_state'),
    to_state: text('to_state').notNull(),
    changed_by_user_id: uuid('changed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reason: text('reason'),
    rule_evaluation_id: uuid('rule_evaluation_id'),
    detail: jsonb('detail').notNull().default('{}'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    esh_exception_idx: index('esh_exception_idx').on(t.exception_id, t.occurred_at),
  }),
);

export type ExceptionStateHistoryRow = typeof exception_state_history.$inferSelect;
export type ExceptionStateHistoryInsert = typeof exception_state_history.$inferInsert;

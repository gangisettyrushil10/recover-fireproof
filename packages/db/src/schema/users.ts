import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './_enums.js';
import { organizations } from './organizations.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    email: text('email').notNull(),
    full_name: text('full_name').notNull(),
    role: userRoleEnum('role').notNull().default('viewer'),
    is_active: boolean('is_active').notNull().default(true),
    mfa_required: boolean('mfa_required').notNull().default(false),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    users_org_email_uq: uniqueIndex('users_org_email_uq').on(t.organization_id, t.email),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

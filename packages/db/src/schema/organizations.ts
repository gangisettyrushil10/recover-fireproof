import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizationKindEnum } from './_enums.js';

/**
 * Tenants. Every business row is partitioned by `organization_id` (no
 * cross-tenant references except where explicitly allowed).
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: organizationKindEnum('kind').notNull().default('contractor'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('active'),
    timezone: text('timezone').notNull().default('UTC'),
    settings: jsonb('settings').notNull().default('{}'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    organizations_slug_uq: uniqueIndex('organizations_slug_uq').on(t.slug),
  }),
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

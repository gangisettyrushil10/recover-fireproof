import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { jurisdictions } from './jurisdictions.js';

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    owner_org_id: uuid('owner_org_id').references(() => organizations.id, {
      onDelete: 'restrict',
    }),
    manager_org_id: uuid('manager_org_id').references(() => organizations.id, {
      onDelete: 'restrict',
    }),
    jurisdiction_id: uuid('jurisdiction_id').references(() => jurisdictions.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    address_json: jsonb('address_json').notNull().default('{}'),
    owner_ref: text('owner_ref'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    properties_org_idx: index('properties_org_idx').on(t.organization_id),
  }),
);

export type PropertyRow = typeof properties.$inferSelect;
export type PropertyInsert = typeof properties.$inferInsert;

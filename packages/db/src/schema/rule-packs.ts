import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { jurisdictions } from './jurisdictions.js';

export const rule_packs = pgTable(
  'rule_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    jurisdiction_id: uuid('jurisdiction_id').references(() => jurisdictions.id, {
      onDelete: 'set null',
    }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description'),
    effective_from: timestamp('effective_from', { withTimezone: true }),
    effective_to: timestamp('effective_to', { withTimezone: true }),
    source_note: text('source_note'),
    status: text('status').notNull().default('active'),
    is_active: boolean('is_active').notNull().default(true),
    requirements: jsonb('requirements').notNull().default('[]'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rule_packs_org_key_idx: index('rule_packs_org_key_idx').on(t.organization_id, t.key),
  }),
);

export type RulePackRow = typeof rule_packs.$inferSelect;
export type RulePackInsert = typeof rule_packs.$inferInsert;

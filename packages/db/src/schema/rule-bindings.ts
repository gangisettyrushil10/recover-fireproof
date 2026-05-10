import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { jurisdictions } from './jurisdictions.js';
import { properties } from './properties.js';
import { rule_packs } from './rule-packs.js';
import { exceptionTypeEnum, ruleBindingScopeEnum } from './_enums.js';

export const rule_bindings = pgTable(
  'rule_bindings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    rule_pack_id: uuid('rule_pack_id')
      .notNull()
      .references(() => rule_packs.id, { onDelete: 'restrict' }),
    scope: ruleBindingScopeEnum('scope').notNull(),
    jurisdiction_id: uuid('jurisdiction_id').references(() => jurisdictions.id, {
      onDelete: 'set null',
    }),
    property_id: uuid('property_id').references(() => properties.id, {
      onDelete: 'cascade',
    }),
    exception_type: exceptionTypeEnum('exception_type').notNull(),
    priority: integer('priority').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    override_json: jsonb('override_json').notNull().default('{}'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rule_bindings_lookup_idx: index('rule_bindings_lookup_idx').on(
      t.organization_id,
      t.exception_type,
      t.scope,
    ),
    rule_bindings_property_idx: index('rule_bindings_property_idx').on(t.property_id),
    rule_bindings_jurisdiction_idx: index('rule_bindings_jurisdiction_idx').on(
      t.jurisdiction_id,
    ),
  }),
);

export type RuleBindingRow = typeof rule_bindings.$inferSelect;
export type RuleBindingInsert = typeof rule_bindings.$inferInsert;

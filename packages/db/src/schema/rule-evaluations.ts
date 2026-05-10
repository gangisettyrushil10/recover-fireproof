import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { exceptions } from './exceptions.js';
import { rule_packs } from './rule-packs.js';
import { rule_bindings } from './rule-bindings.js';

export const rule_evaluations = pgTable(
  'rule_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    exception_id: uuid('exception_id')
      .notNull()
      .references(() => exceptions.id, { onDelete: 'cascade' }),
    rule_pack_id: uuid('rule_pack_id')
      .notNull()
      .references(() => rule_packs.id, { onDelete: 'restrict' }),
    rule_binding_id: uuid('rule_binding_id').references(() => rule_bindings.id, {
      onDelete: 'set null',
    }),
    requirements_json: jsonb('requirements_json').notNull().default('[]'),
    blocking_json: jsonb('blocking_json').notNull().default('[]'),
    is_satisfied: boolean('is_satisfied').notNull().default(false),
    evaluated_at: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rule_evaluations_exception_idx: index('rule_evaluations_exception_idx').on(
      t.exception_id,
      t.evaluated_at,
    ),
  }),
);

export type RuleEvaluationRow = typeof rule_evaluations.$inferSelect;
export type RuleEvaluationInsert = typeof rule_evaluations.$inferInsert;

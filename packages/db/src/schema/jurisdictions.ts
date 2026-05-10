import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { jurisdictionConfidenceEnum } from './_enums.js';

export const jurisdictions = pgTable('jurisdictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ahj_name: text('ahj_name').notNull(),
  state_code: text('state_code').notNull(),
  county: text('county'),
  city: text('city'),
  default_rule_pack_id: uuid('default_rule_pack_id'),
  confidence: jurisdictionConfidenceEnum('confidence').notNull().default('low_inferred'),
  metadata: jsonb('metadata').notNull().default('{}'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type JurisdictionRow = typeof jurisdictions.$inferSelect;
export type JurisdictionInsert = typeof jurisdictions.$inferInsert;

import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { properties } from './properties.js';
import { exceptions } from './exceptions.js';
import { document_claims } from './document-claims.js';
import { users } from './users.js';
import {
  contradictionResolutionStatusEnum,
  contradictionTypeEnum,
  severityEnum,
} from './_enums.js';

export const contradictions = pgTable(
  'contradictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    property_id: uuid('property_id').references(() => properties.id, {
      onDelete: 'cascade',
    }),
    exception_id: uuid('exception_id').references(() => exceptions.id, {
      onDelete: 'cascade',
    }),
    type: contradictionTypeEnum('type').notNull(),
    severity: severityEnum('severity').notNull(),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull().default('1.000'),
    claim_a_id: uuid('claim_a_id')
      .notNull()
      .references(() => document_claims.id, { onDelete: 'cascade' }),
    claim_b_id: uuid('claim_b_id')
      .notNull()
      .references(() => document_claims.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    resolution_status: contradictionResolutionStatusEnum('resolution_status')
      .notNull()
      .default('open'),
    resolved_by_user_id: uuid('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    resolution_note: text('resolution_note'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contradictions_lookup_idx: index('contradictions_lookup_idx').on(
      t.property_id,
      t.resolution_status,
      t.severity,
    ),
  }),
);

export type ContradictionRow = typeof contradictions.$inferSelect;
export type ContradictionInsert = typeof contradictions.$inferInsert;

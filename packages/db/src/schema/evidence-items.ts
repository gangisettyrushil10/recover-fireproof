import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { exceptions } from './exceptions.js';
import { users } from './users.js';
import { evidenceStatusEnum, evidenceTypeEnum } from './_enums.js';

export const evidence_items = pgTable(
  'evidence_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    exception_id: uuid('exception_id')
      .notNull()
      .references(() => exceptions.id, { onDelete: 'cascade' }),
    evidence_type: evidenceTypeEnum('evidence_type').notNull(),
    status: evidenceStatusEnum('status').notNull().default('missing'),
    required: boolean('required').notNull().default(true),
    blocking: boolean('blocking').notNull().default(false),
    rule_key: text('rule_key'),
    document_version_ids: jsonb('document_version_ids').notNull().default('[]'),
    captured_at: timestamp('captured_at', { withTimezone: true }),
    validated_at: timestamp('validated_at', { withTimezone: true }),
    validation_errors_json: jsonb('validation_errors_json').notNull().default('[]'),
    waived_by_user_id: uuid('waived_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    waived_at: timestamp('waived_at', { withTimezone: true }),
    waiver_reason: text('waiver_reason'),
    notes: text('notes'),
    payload: jsonb('payload').notNull().default('{}'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    evidence_items_exception_idx: index('evidence_items_exception_idx').on(
      t.exception_id,
      t.status,
      t.evidence_type,
    ),
    evidence_items_unique: uniqueIndex('evidence_items_unique').on(
      t.exception_id,
      t.evidence_type,
    ),
  }),
);

export type EvidenceItemRow = typeof evidence_items.$inferSelect;
export type EvidenceItemInsert = typeof evidence_items.$inferInsert;

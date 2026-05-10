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
import { document_versions } from './document-versions.js';
import { claimTypeEnum } from './_enums.js';

export const document_claims = pgTable(
  'document_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    document_version_id: uuid('document_version_id')
      .notNull()
      .references(() => document_versions.id, { onDelete: 'cascade' }),
    claim_type: claimTypeEnum('claim_type').notNull(),
    /** Polymorphic reference: `kind` is one of EntityRefKind. */
    claim_subject_kind: text('claim_subject_kind').notNull(),
    claim_subject_ref: uuid('claim_subject_ref').notNull(),
    claim_value_json: jsonb('claim_value_json').notNull().default('{}'),
    claim_time_range_json: jsonb('claim_time_range_json'),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull().default('1.000'),
    provenance: jsonb('provenance').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    document_claims_subject_idx: index('document_claims_subject_idx').on(
      t.claim_subject_ref,
      t.claim_type,
    ),
    document_claims_version_idx: index('document_claims_version_idx').on(t.document_version_id),
  }),
);

export type DocumentClaimRow = typeof document_claims.$inferSelect;
export type DocumentClaimInsert = typeof document_claims.$inferInsert;

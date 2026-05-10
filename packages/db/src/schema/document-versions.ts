import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations.js';
import { documents } from './documents.js';
import { users } from './users.js';

/**
 * Immutable version of a document. Service code MUST NOT update or delete
 * rows where `is_original = true`.
 */
export const document_versions = pgTable(
  'document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    document_id: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    version_no: bigint('version_no', { mode: 'number' }).notNull(),
    sha256: text('sha256').notNull(),
    storage_key: text('storage_key').notNull(),
    mime_type: text('mime_type').notNull(),
    byte_size: bigint('byte_size', { mode: 'number' }).notNull(),
    is_original: boolean('is_original').notNull().default(false),
    supersedes_version_id: uuid('supersedes_version_id').references(
      (): AnyPgColumn => document_versions.id,
      { onDelete: 'set null' },
    ),
    uploaded_by_user_id: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    uploaded_at: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dv_document_version_idx: index('dv_document_version_idx').on(
      t.document_id,
      sql`${t.version_no} DESC`,
    ),
    dv_sha_idx: index('dv_sha_idx').on(t.sha256),
  }),
);

export type DocumentVersionRow = typeof document_versions.$inferSelect;
export type DocumentVersionInsert = typeof document_versions.$inferInsert;

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { properties } from './properties.js';
import { exceptions } from './exceptions.js';
import { users } from './users.js';
import { documentSourceTypeEnum, holdStatusEnum } from './_enums.js';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    property_id: uuid('property_id').references(() => properties.id, {
      onDelete: 'set null',
    }),
    exception_id: uuid('exception_id').references(() => exceptions.id, {
      onDelete: 'set null',
    }),
    source_type: documentSourceTypeEnum('source_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    document_date: timestamp('document_date', { withTimezone: true }),
    hold_status: holdStatusEnum('hold_status').notNull().default('none'),
    uploaded_by_user_id: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    documents_property_idx: index('documents_property_idx').on(t.property_id),
    documents_exception_idx: index('documents_exception_idx').on(t.exception_id),
  }),
);

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;

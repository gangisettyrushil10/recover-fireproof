import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { packets } from './packets.js';
import { document_versions } from './document-versions.js';
import { evidence_items } from './evidence-items.js';
import { packetItemKindEnum } from './_enums.js';

export const packet_items = pgTable(
  'packet_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    packet_id: uuid('packet_id')
      .notNull()
      .references(() => packets.id, { onDelete: 'cascade' }),
    kind: packetItemKindEnum('kind').notNull(),
    document_version_id: uuid('document_version_id').references(
      () => document_versions.id,
      { onDelete: 'set null' },
    ),
    evidence_item_id: uuid('evidence_item_id').references(() => evidence_items.id, {
      onDelete: 'set null',
    }),
    included_as: text('included_as'),
    order_index: integer('order_index').notNull().default(0),
    title: text('title'),
    body: text('body'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    packet_items_packet_idx: index('packet_items_packet_idx').on(t.packet_id, t.order_index),
  }),
);

export type PacketItemRow = typeof packet_items.$inferSelect;
export type PacketItemInsert = typeof packet_items.$inferInsert;

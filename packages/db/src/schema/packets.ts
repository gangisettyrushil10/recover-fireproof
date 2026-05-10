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
import { packetStatusEnum, packetTypeEnum } from './_enums.js';

export const packets = pgTable(
  'packets',
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
    packet_type: packetTypeEnum('packet_type').notNull(),
    status: packetStatusEnum('status').notNull().default('draft'),
    title: text('title').notNull(),
    artifact_storage_key: text('artifact_storage_key'),
    manifest_json: jsonb('manifest_json').notNull().default('{}'),
    generated_at: timestamp('generated_at', { withTimezone: true }),
    generated_by_user_id: uuid('generated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    emitted_at: timestamp('emitted_at', { withTimezone: true }),
    emitted_by_user_id: uuid('emitted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    packets_property_idx: index('packets_property_idx').on(t.property_id, t.packet_type),
  }),
);

export type PacketRow = typeof packets.$inferSelect;
export type PacketInsert = typeof packets.$inferInsert;

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
import { systems } from './systems.js';
import { assetKindEnum } from './_enums.js';

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    property_id: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'restrict' }),
    system_id: uuid('system_id').references(() => systems.id, {
      onDelete: 'set null',
    }),
    kind: assetKindEnum('kind').notNull(),
    asset_class: text('asset_class'),
    identifier: text('identifier').notNull(),
    manufacturer: text('manufacturer'),
    model: text('model'),
    serial_number: text('serial_number'),
    installed_at: timestamp('installed_at', { withTimezone: true }),
    location_description: text('location_description'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    assets_system_idx: index('assets_system_idx').on(t.system_id),
    assets_property_idx: index('assets_property_idx').on(t.property_id),
  }),
);

export type AssetRow = typeof assets.$inferSelect;
export type AssetInsert = typeof assets.$inferInsert;

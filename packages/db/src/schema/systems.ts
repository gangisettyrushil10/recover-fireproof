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
import { systemKindEnum } from './_enums.js';

export const systems = pgTable(
  'systems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    property_id: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'restrict' }),
    kind: systemKindEnum('kind').notNull(),
    system_class: text('system_class'),
    label: text('label'),
    name: text('name').notNull(),
    location: text('location'),
    standard_ref: text('standard_ref'),
    description: text('description'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    systems_property_idx: index('systems_property_idx').on(t.property_id),
  }),
);

export type SystemRow = typeof systems.$inferSelect;
export type SystemInsert = typeof systems.$inferInsert;

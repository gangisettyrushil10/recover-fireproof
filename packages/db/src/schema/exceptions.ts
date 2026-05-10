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
import { assets } from './assets.js';
import { jurisdictions } from './jurisdictions.js';
import { rule_packs } from './rule-packs.js';
import { users } from './users.js';
import {
  exceptionTypeEnum,
  holdStatusEnum,
  jurisdictionConfidenceEnum,
  severityEnum,
} from './_enums.js';

/**
 * One canonical row per exception. The `state` column stores the
 * per-type state value as TEXT (validated at the service layer using
 * `@fireproof/domain` enums); we keep it as text rather than a single
 * pg-enum because the legal value depends on `type`.
 */
export const exceptions = pgTable(
  'exceptions',
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
    asset_id: uuid('asset_id').references(() => assets.id, {
      onDelete: 'set null',
    }),
    jurisdiction_id: uuid('jurisdiction_id').references(() => jurisdictions.id, {
      onDelete: 'set null',
    }),
    jurisdiction_confidence: jurisdictionConfidenceEnum('jurisdiction_confidence'),
    type: exceptionTypeEnum('type').notNull(),
    state: text('state').notNull(),
    severity: severityEnum('severity').notNull(),
    hold_status: holdStatusEnum('hold_status').notNull().default('none'),
    title: text('title').notNull(),
    summary: text('summary'),
    rule_pack_id: uuid('rule_pack_id').references(() => rule_packs.id, {
      onDelete: 'set null',
    }),
    assigned_user_id: uuid('assigned_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reporter_user_id: uuid('reporter_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    opened_at: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closed_at: timestamp('closed_at', { withTimezone: true }),
    due_at: timestamp('due_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    exceptions_property_state_idx: index('exceptions_property_state_idx').on(
      t.property_id,
      t.state,
      t.type,
      t.severity,
    ),
    exceptions_org_idx: index('exceptions_org_idx').on(t.organization_id),
  }),
);

export type ExceptionRow = typeof exceptions.$inferSelect;
export type ExceptionInsert = typeof exceptions.$inferInsert;

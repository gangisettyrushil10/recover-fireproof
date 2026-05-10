import { z } from 'zod';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  AssetIdSchema,
  OrganizationIdSchema,
  PropertyIdSchema,
  SystemIdSchema,
} from './_branded.js';

/**
 * Discrete components within a system that we track identity on
 * (e.g. backflow preventers, alarm panels, extinguishers). The "asset
 * identity" exception type is bound to mismatches discovered on these.
 */
export const AssetKindValues = [
  'backflow_preventer',
  'control_valve',
  'alarm_panel',
  'sprinkler_head',
  'fire_pump',
  'extinguisher',
  'pressure_gauge',
  'detector',
  'other',
] as const;
export type AssetKind = (typeof AssetKindValues)[number];

export const AssetSchema = z.object({
  id: AssetIdSchema,
  organization_id: OrganizationIdSchema,
  property_id: PropertyIdSchema,
  system_id: SystemIdSchema.nullable().optional(),
  kind: z.enum(AssetKindValues),
  identifier: z.string().min(1),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  installed_at: IsoDateTimeSchema.nullable().optional(),
  location_description: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Asset = z.infer<typeof AssetSchema>;

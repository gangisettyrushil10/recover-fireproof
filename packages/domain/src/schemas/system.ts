import { z } from 'zod';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  OrganizationIdSchema,
  PropertyIdSchema,
  SystemIdSchema,
} from './_branded.js';

/** Fire-protection system kinds we care about at MVP. */
export const SystemKindValues = [
  'sprinkler_wet',
  'sprinkler_dry',
  'sprinkler_pre_action',
  'sprinkler_deluge',
  'standpipe',
  'fire_pump',
  'fire_alarm',
  'suppression_clean_agent',
  'suppression_co2',
  'suppression_kitchen',
  'extinguishers_portable',
  'other',
] as const;
export type SystemKind = (typeof SystemKindValues)[number];

export const SystemSchema = z.object({
  id: SystemIdSchema,
  organization_id: OrganizationIdSchema,
  property_id: PropertyIdSchema,
  kind: z.enum(SystemKindValues),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type System = z.infer<typeof SystemSchema>;

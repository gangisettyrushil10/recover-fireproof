import { z } from 'zod';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  JurisdictionIdSchema,
  OrganizationIdSchema,
  PropertyIdSchema,
} from './_branded.js';

export const PropertyAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  state_code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  postal_code: z.string().min(1),
  country: z.string().length(2).default('US'),
});
export type PropertyAddress = z.infer<typeof PropertyAddressSchema>;

export const PropertySchema = z.object({
  id: PropertyIdSchema,
  organization_id: OrganizationIdSchema,
  name: z.string().min(1),
  address: PropertyAddressSchema,
  jurisdiction_id: JurisdictionIdSchema.nullable().optional(),
  /**
   * Owner customer reference. Free-form for now; downstream agents can
   * tighten this once the customer model is locked.
   */
  owner_ref: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Property = z.infer<typeof PropertySchema>;

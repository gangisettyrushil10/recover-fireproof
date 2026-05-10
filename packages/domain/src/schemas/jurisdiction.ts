import { z } from 'zod';
import { JurisdictionConfidenceValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import { JurisdictionIdSchema } from './_branded.js';

export const JurisdictionSchema = z.object({
  id: JurisdictionIdSchema,
  name: z.string().min(1),
  ahj_name: z.string().min(1),
  state_code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  county: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  /**
   * Confidence with which this jurisdiction was identified for a given
   * property. Stored on the jurisdiction-property link in some setups; we
   * keep it here too for the inferred-default case used by rule lookup.
   */
  confidence: z.enum(JurisdictionConfidenceValues),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

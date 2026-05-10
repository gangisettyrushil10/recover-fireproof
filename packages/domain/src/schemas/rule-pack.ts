import { z } from 'zod';
import { EvidenceTypeValues, ExceptionTypeValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import { OrganizationIdSchema, RulePackIdSchema } from './_branded.js';

/**
 * A single requirement inside a rule pack. `evidence_type` is the slot it
 * fills on an exception's evidence list; `blocking` controls whether
 * missing/insufficient status hard-blocks state transitions.
 */
export const RuleRequirementSchema = z.object({
  /** Stable key, unique within the rule pack. */
  key: z.string().min(1),
  evidence_type: z.enum(EvidenceTypeValues),
  /** Which exception type this requirement applies to. */
  exception_type: z.enum(ExceptionTypeValues),
  description: z.string().min(1),
  required: z.boolean().default(true),
  blocking: z.boolean().default(false),
  /** Optional structured parameters (e.g., interval minutes for fire watch). */
  parameters: z.record(z.string(), z.unknown()).default({}),
});
export type RuleRequirement = z.infer<typeof RuleRequirementSchema>;

export const RulePackSchema = z.object({
  id: RulePackIdSchema,
  organization_id: OrganizationIdSchema,
  /** Stable key for the pack (e.g. "us-default", "ca-sf"). */
  key: z.string().min(1),
  name: z.string().min(1),
  /** Semver-style version label. */
  version: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  /** Ordered requirements in this pack. */
  requirements: z.array(RuleRequirementSchema).default([]),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type RulePack = z.infer<typeof RulePackSchema>;

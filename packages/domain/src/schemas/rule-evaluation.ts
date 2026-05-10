import { z } from 'zod';
import { EvidenceStatusValues, EvidenceTypeValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  ExceptionIdSchema,
  OrganizationIdSchema,
  RuleBindingIdSchema,
  RuleEvaluationIdSchema,
  RulePackIdSchema,
} from './_branded.js';

/** Result of evaluating a single rule requirement against an exception. */
export const RequirementResultSchema = z.object({
  /** Matches `RuleRequirement.key`. */
  key: z.string().min(1),
  evidence_type: z.enum(EvidenceTypeValues),
  status: z.enum(EvidenceStatusValues),
  required: z.boolean(),
  blocking: z.boolean(),
  satisfied: z.boolean(),
  /** Optional human-readable explanation. */
  reason: z.string().nullable().optional(),
  /** Structured detail the UI can render (e.g., missing time-window minutes). */
  detail: z.record(z.string(), z.unknown()).default({}),
});
export type RequirementResult = z.infer<typeof RequirementResultSchema>;

export const RuleEvaluationSchema = z.object({
  id: RuleEvaluationIdSchema,
  organization_id: OrganizationIdSchema,
  exception_id: ExceptionIdSchema,
  rule_pack_id: RulePackIdSchema,
  rule_binding_id: RuleBindingIdSchema.nullable().optional(),
  /** Per-requirement outcomes, in declaration order. */
  requirements: z.array(RequirementResultSchema).default([]),
  /** Subset of `requirements` whose `blocking && !satisfied` is true. */
  blocking: z.array(RequirementResultSchema).default([]),
  /** Cached top-level verdict for fast filtering. */
  is_satisfied: z.boolean(),
  evaluated_at: IsoDateTimeSchema,
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
});
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

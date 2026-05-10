import { z } from 'zod';
import { ContradictionResolutionStatusValues, SeverityValues } from '../enums.js';
import {
  ConfidenceSchema,
  IsoDateTimeSchema,
  MetadataSchema,
} from './_primitives.js';
import {
  ContradictionIdSchema,
  DocumentClaimIdSchema,
  ExceptionIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

/** Categories of contradictions detected between two claims. */
export const ContradictionTypeValues = [
  'time_overlap_disagreement',
  'identity_attribute_mismatch',
  'restoration_test_disagreement',
  'notification_proof_missing_or_late',
  'fire_watch_gap',
  'asset_location_conflict',
  'other',
] as const;
export type ContradictionType = (typeof ContradictionTypeValues)[number];

export const ContradictionSchema = z.object({
  id: ContradictionIdSchema,
  organization_id: OrganizationIdSchema,
  exception_id: ExceptionIdSchema,
  type: z.enum(ContradictionTypeValues),
  severity: z.enum(SeverityValues),
  confidence: ConfidenceSchema,
  claim_a_id: DocumentClaimIdSchema,
  claim_b_id: DocumentClaimIdSchema,
  description: z.string().min(1),
  resolution_status: z.enum(ContradictionResolutionStatusValues).default('open'),
  resolved_by_user_id: UserIdSchema.nullable().optional(),
  resolved_at: IsoDateTimeSchema.nullable().optional(),
  resolution_note: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

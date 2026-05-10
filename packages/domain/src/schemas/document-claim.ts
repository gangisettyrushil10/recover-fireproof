import { z } from 'zod';
import {
  ConfidenceSchema,
  EntityRefSchema,
  IsoDateTimeSchema,
  MetadataSchema,
  TimeRangeSchema,
} from './_primitives.js';
import {
  DocumentClaimIdSchema,
  DocumentVersionIdSchema,
  OrganizationIdSchema,
} from './_branded.js';

/**
 * A factual claim extracted from a document version. Examples:
 *   - "Sprinkler 7B was impaired from 2024-08-12T10:00 to 2024-08-12T16:30."
 *   - "Backflow #BFP-204 model is Watts 909, S/N 1234."
 *
 * `claim_subject_ref` points at the entity the claim is about, and
 * `claim_value` is the structured payload the claim asserts.
 */
export const ClaimTypeValues = [
  'impairment_window',
  'fire_watch_interval',
  'restoration_test_result',
  'asset_identity_attribute',
  'notification_event',
  'customer_decision_event',
  'proposal_transmission',
  'other',
] as const;
export type ClaimType = (typeof ClaimTypeValues)[number];

export const DocumentClaimSchema = z.object({
  id: DocumentClaimIdSchema,
  organization_id: OrganizationIdSchema,
  document_version_id: DocumentVersionIdSchema,
  claim_type: z.enum(ClaimTypeValues),
  /** The entity the claim is about, e.g. `{ kind: 'asset', id: '…' }`. */
  claim_subject_ref: EntityRefSchema,
  /** Structured payload — schema varies by `claim_type`. */
  claim_value: z.record(z.string(), z.unknown()),
  /** Optional time range the claim covers. */
  claim_time_range: TimeRangeSchema.nullable().optional(),
  /** Extractor confidence in [0, 1]. */
  confidence: ConfidenceSchema.default(1),
  /** Free-form provenance (extractor name, page, bbox, etc.). */
  provenance: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
});
export type DocumentClaim = z.infer<typeof DocumentClaimSchema>;

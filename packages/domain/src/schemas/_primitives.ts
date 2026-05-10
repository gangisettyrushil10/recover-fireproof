/**
 * Reusable Zod primitives for the wire format.
 *
 * Dates are always ISO-8601 strings on the wire. The DB layer converts to
 * `Date` / `timestamptz` at the edge.
 */

import { z } from 'zod';

/** ISO-8601 datetime string with timezone offset. */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** Calendar date `YYYY-MM-DD`. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** SHA-256 hex (64 lowercase hex chars). */
export const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, 'sha256 hex');
export type Sha256 = z.infer<typeof Sha256Schema>;

/** Non-negative integer count of bytes. */
export const ByteSizeSchema = z.number().int().nonnegative();
export type ByteSize = z.infer<typeof ByteSizeSchema>;

/** A confidence score in [0, 1]. */
export const ConfidenceSchema = z.number().min(0).max(1);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Generic JSON-safe metadata bag. */
export const MetadataSchema = z.record(z.string(), z.unknown());
export type Metadata = z.infer<typeof MetadataSchema>;

/** Inclusive/exclusive time range used by document claims. Both bounds optional. */
export const TimeRangeSchema = z
  .object({
    start: IsoDateTimeSchema.optional(),
    end: IsoDateTimeSchema.optional(),
  })
  .refine(
    (r) => !r.start || !r.end || new Date(r.start) <= new Date(r.end),
    { message: 'start must be <= end' },
  );
export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Reference to another entity by `(kind, id)`. Used wherever a column is
 * polymorphic (e.g. `claim_subject_ref`, `audit.subject`).
 */
export const EntityRefKindValues = [
  'organization',
  'user',
  'property',
  'jurisdiction',
  'system',
  'asset',
  'exception',
  'evidence_item',
  'document',
  'document_version',
  'document_claim',
  'rule_pack',
  'rule_binding',
  'rule_evaluation',
  'contradiction',
  'packet',
  'packet_item',
  'legal_hold',
  'notification',
] as const;
export type EntityRefKind = (typeof EntityRefKindValues)[number];

export const EntityRefSchema = z.object({
  kind: z.enum(EntityRefKindValues),
  id: z.string().uuid(),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

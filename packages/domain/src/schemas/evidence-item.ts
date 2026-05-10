import { z } from 'zod';
import { EvidenceStatusValues, EvidenceTypeValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  DocumentVersionIdSchema,
  EvidenceItemIdSchema,
  ExceptionIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

/**
 * An EvidenceItem is the per-exception slot for a particular EvidenceType
 * required by a rule pack. It is satisfied by attaching one or more
 * document versions (and/or document claims).
 */
export const EvidenceItemSchema = z.object({
  id: EvidenceItemIdSchema,
  organization_id: OrganizationIdSchema,
  exception_id: ExceptionIdSchema,
  evidence_type: z.enum(EvidenceTypeValues),
  status: z.enum(EvidenceStatusValues).default('missing'),
  required: z.boolean().default(true),
  blocking: z.boolean().default(false),
  /** Free-form rule key the binding referenced; useful in audits. */
  rule_key: z.string().nullable().optional(),
  document_version_ids: z.array(DocumentVersionIdSchema).default([]),
  waived_by_user_id: UserIdSchema.nullable().optional(),
  waived_at: IsoDateTimeSchema.nullable().optional(),
  waiver_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceItemUpsertSchema = EvidenceItemSchema.pick({
  exception_id: true,
  evidence_type: true,
  status: true,
  required: true,
  blocking: true,
  rule_key: true,
  document_version_ids: true,
  notes: true,
  metadata: true,
}).partial({
  status: true,
  required: true,
  blocking: true,
  rule_key: true,
  document_version_ids: true,
  notes: true,
  metadata: true,
});
export type EvidenceItemUpsert = z.infer<typeof EvidenceItemUpsertSchema>;

import { z } from 'zod';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  DocumentVersionIdSchema,
  EvidenceItemIdSchema,
  OrganizationIdSchema,
  PacketIdSchema,
  PacketItemIdSchema,
} from './_branded.js';

/**
 * Ordered components of a packet. Each item points at either a specific
 * document_version (preferred — immutability is preserved) or an evidence
 * item (when the export should resolve to whatever versions are valid at
 * emit time).
 */
export const PacketItemKindValues = [
  'document_version',
  'evidence_item',
  'narrative',
  'cover_letter',
  'index',
] as const;
export type PacketItemKind = (typeof PacketItemKindValues)[number];

export const PacketItemSchema = z
  .object({
    id: PacketItemIdSchema,
    organization_id: OrganizationIdSchema,
    packet_id: PacketIdSchema,
    kind: z.enum(PacketItemKindValues),
    /** 0-based ordering within the packet. */
    position: z.number().int().nonnegative(),
    document_version_id: DocumentVersionIdSchema.nullable().optional(),
    evidence_item_id: EvidenceItemIdSchema.nullable().optional(),
    /** For narrative / cover-letter / index, optional rendered text. */
    body: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    metadata: MetadataSchema.default({}),
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .superRefine((it, ctx) => {
    if (it.kind === 'document_version' && !it.document_version_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'document_version_id required for document_version items',
        path: ['document_version_id'],
      });
    }
    if (it.kind === 'evidence_item' && !it.evidence_item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'evidence_item_id required for evidence_item items',
        path: ['evidence_item_id'],
      });
    }
  });
export type PacketItem = z.infer<typeof PacketItemSchema>;

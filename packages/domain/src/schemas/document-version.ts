import { z } from 'zod';
import {
  ByteSizeSchema,
  IsoDateTimeSchema,
  MetadataSchema,
  Sha256Schema,
} from './_primitives.js';
import {
  DocumentIdSchema,
  DocumentVersionIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

/**
 * Immutable byte-for-byte version of a document. New facts (corrections,
 * supersedes, redactions for export) MUST create a new version; mutating
 * an existing version is forbidden — see CLAUDE.md.
 */
export const DocumentVersionSchema = z.object({
  id: DocumentVersionIdSchema,
  organization_id: OrganizationIdSchema,
  document_id: DocumentIdSchema,
  /** 1-based; monotonically increasing within a document. */
  version: z.number().int().positive(),
  sha256: Sha256Schema,
  byte_size: ByteSizeSchema,
  mime_type: z.string().min(1),
  /** Object-store key for the immutable blob (e.g., S3 key). */
  storage_key: z.string().min(1),
  /** True if this is the as-received original; false for derived/redacted. */
  is_original: z.boolean(),
  /** Predecessor this version supersedes, if any. */
  supersedes_version_id: DocumentVersionIdSchema.nullable().optional(),
  uploaded_by_user_id: UserIdSchema.nullable().optional(),
  uploaded_at: IsoDateTimeSchema,
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
});
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>;

export const DocumentVersionCreateSchema = DocumentVersionSchema.pick({
  document_id: true,
  sha256: true,
  byte_size: true,
  mime_type: true,
  storage_key: true,
  is_original: true,
  supersedes_version_id: true,
  uploaded_by_user_id: true,
  metadata: true,
}).partial({
  is_original: true,
  supersedes_version_id: true,
  uploaded_by_user_id: true,
  metadata: true,
});
export type DocumentVersionCreate = z.infer<typeof DocumentVersionCreateSchema>;

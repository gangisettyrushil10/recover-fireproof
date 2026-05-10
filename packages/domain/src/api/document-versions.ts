import { z } from 'zod';
import {
  DocumentVersionCreateSchema,
  DocumentVersionSchema,
} from '../schemas/document-version.js';
import { DocumentSchema } from '../schemas/document.js';
import { paginated, PaginationRequestSchema } from './_common.js';

// ─── POST /v1/documents/:id/versions ────────────────────────────────────────

export const CreateDocumentVersionRequestSchema = DocumentVersionCreateSchema.omit({
  document_id: true,
});
export type CreateDocumentVersionRequest = z.infer<
  typeof CreateDocumentVersionRequestSchema
>;

export const CreateDocumentVersionResponseSchema = DocumentVersionSchema;
export type CreateDocumentVersionResponse = z.infer<
  typeof CreateDocumentVersionResponseSchema
>;

// ─── GET /v1/documents/:id ──────────────────────────────────────────────────

export const GetDocumentResponseSchema = z.object({
  document: DocumentSchema,
  versions: z.array(DocumentVersionSchema),
});
export type GetDocumentResponse = z.infer<typeof GetDocumentResponseSchema>;

// ─── GET /v1/documents/:id/versions ─────────────────────────────────────────

export const ListDocumentVersionsQuerySchema = PaginationRequestSchema;
export type ListDocumentVersionsQuery = z.infer<typeof ListDocumentVersionsQuerySchema>;

export const ListDocumentVersionsResponseSchema = paginated(DocumentVersionSchema);
export type ListDocumentVersionsResponse = z.infer<
  typeof ListDocumentVersionsResponseSchema
>;

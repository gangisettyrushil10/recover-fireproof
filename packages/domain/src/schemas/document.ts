import { z } from 'zod';
import { DocumentSourceTypeValues, HoldStatusValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  DocumentIdSchema,
  ExceptionIdSchema,
  OrganizationIdSchema,
  PropertyIdSchema,
  UserIdSchema,
} from './_branded.js';

/**
 * Logical document. The actual immutable bytes live on `document_versions`;
 * a Document is the stable handle that versions hang off.
 */
export const DocumentSchema = z.object({
  id: DocumentIdSchema,
  organization_id: OrganizationIdSchema,
  property_id: PropertyIdSchema.nullable().optional(),
  exception_id: ExceptionIdSchema.nullable().optional(),
  source_type: z.enum(DocumentSourceTypeValues),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  hold_status: z.enum(HoldStatusValues).default('none'),
  uploaded_by_user_id: UserIdSchema.nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Document = z.infer<typeof DocumentSchema>;

export const DocumentCreateSchema = DocumentSchema.pick({
  organization_id: true,
  property_id: true,
  exception_id: true,
  source_type: true,
  title: true,
  description: true,
  uploaded_by_user_id: true,
  metadata: true,
}).partial({
  property_id: true,
  exception_id: true,
  description: true,
  uploaded_by_user_id: true,
  metadata: true,
});
export type DocumentCreate = z.infer<typeof DocumentCreateSchema>;

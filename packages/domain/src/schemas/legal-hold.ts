import { z } from 'zod';
import { HoldStatusValues } from '../enums.js';
import {
  EntityRefSchema,
  IsoDateTimeSchema,
  MetadataSchema,
} from './_primitives.js';
import {
  LegalHoldIdSchema,
  OrganizationIdSchema,
  UserIdSchema,
} from './_branded.js';

/**
 * A legal hold scopes a set of subjects (exceptions, documents, evidence
 * items) as immutable until released. While `status === 'active'`,
 * supersession / deletion of in-scope items is forbidden.
 */
export const LegalHoldSchema = z.object({
  id: LegalHoldIdSchema,
  organization_id: OrganizationIdSchema,
  name: z.string().min(1),
  reason: z.string().min(1),
  status: z.enum(HoldStatusValues).default('pending'),
  /** Subjects covered by this hold. */
  subjects: z.array(EntityRefSchema).default([]),
  issued_by_user_id: UserIdSchema.nullable().optional(),
  issued_at: IsoDateTimeSchema.nullable().optional(),
  released_by_user_id: UserIdSchema.nullable().optional(),
  released_at: IsoDateTimeSchema.nullable().optional(),
  release_reason: z.string().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type LegalHold = z.infer<typeof LegalHoldSchema>;

export const LegalHoldCreateSchema = LegalHoldSchema.pick({
  organization_id: true,
  name: true,
  reason: true,
  subjects: true,
  metadata: true,
}).partial({ subjects: true, metadata: true });
export type LegalHoldCreate = z.infer<typeof LegalHoldCreateSchema>;

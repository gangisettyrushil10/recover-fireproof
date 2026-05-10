import { z } from 'zod';
import { UserRoleValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import { OrganizationIdSchema, UserIdSchema } from './_branded.js';

export const UserSchema = z.object({
  id: UserIdSchema,
  organization_id: OrganizationIdSchema,
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(UserRoleValues),
  is_active: z.boolean().default(true),
  last_login_at: IsoDateTimeSchema.nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = UserSchema.pick({
  organization_id: true,
  email: true,
  full_name: true,
  role: true,
}).extend({
  is_active: z.boolean().optional(),
  metadata: MetadataSchema.optional(),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

import { z } from 'zod';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import { OrganizationIdSchema } from './_branded.js';

export const OrganizationSchema = z.object({
  id: OrganizationIdSchema,
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'kebab-case slug'),
  timezone: z.string().min(1).default('UTC'),
  settings: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationCreateSchema = OrganizationSchema.pick({
  name: true,
  slug: true,
  timezone: true,
  settings: true,
}).partial({ timezone: true, settings: true });
export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>;

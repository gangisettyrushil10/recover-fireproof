import { z } from 'zod';
import { PacketStatusValues, PacketTypeValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  ExceptionIdSchema,
  OrganizationIdSchema,
  PacketIdSchema,
  PacketItemIdSchema,
  UserIdSchema,
} from './_branded.js';

export const PacketSchema = z.object({
  id: PacketIdSchema,
  organization_id: OrganizationIdSchema,
  exception_id: ExceptionIdSchema,
  type: z.enum(PacketTypeValues),
  status: z.enum(PacketStatusValues).default('draft'),
  title: z.string().min(1),
  /** Stable URL/key of the rendered packet artifact, once emitted. */
  artifact_storage_key: z.string().nullable().optional(),
  emitted_at: IsoDateTimeSchema.nullable().optional(),
  emitted_by_user_id: UserIdSchema.nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});
export type Packet = z.infer<typeof PacketSchema>;

export const PacketCreateSchema = PacketSchema.pick({
  organization_id: true,
  exception_id: true,
  type: true,
  title: true,
  metadata: true,
}).partial({ metadata: true });
export type PacketCreate = z.infer<typeof PacketCreateSchema>;

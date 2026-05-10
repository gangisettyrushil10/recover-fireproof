import { z } from 'zod';
import { PacketCreateSchema, PacketSchema } from '../schemas/packet.js';
import { PacketItemSchema } from '../schemas/packet-item.js';
import { paginated, PaginationRequestSchema } from './_common.js';
import { PacketTypeValues } from '../enums.js';
import { MetadataSchema } from '../schemas/_primitives.js';

// ─── POST /v1/packets ───────────────────────────────────────────────────────

export const CreatePacketRequestSchema = PacketCreateSchema;
export type CreatePacketRequest = z.infer<typeof CreatePacketRequestSchema>;

export const CreatePacketResponseSchema = PacketSchema;
export type CreatePacketResponse = z.infer<typeof CreatePacketResponseSchema>;

// ─── POST /v1/packets/:id/emit ──────────────────────────────────────────────

export const EmitPacketRequestSchema = z.object({
  /** Optional override on the rendered title at emit time. */
  title: z.string().min(1).optional(),
  metadata: MetadataSchema.optional(),
});
export type EmitPacketRequest = z.infer<typeof EmitPacketRequestSchema>;

export const EmitPacketResponseSchema = PacketSchema;
export type EmitPacketResponse = z.infer<typeof EmitPacketResponseSchema>;

// ─── GET /v1/packets ────────────────────────────────────────────────────────

export const ListPacketsQuerySchema = PaginationRequestSchema.extend({
  exception_id: z.string().uuid().optional(),
  type: z.enum(PacketTypeValues).optional(),
});
export type ListPacketsQuery = z.infer<typeof ListPacketsQuerySchema>;

export const ListPacketsResponseSchema = paginated(PacketSchema);
export type ListPacketsResponse = z.infer<typeof ListPacketsResponseSchema>;

// ─── GET /v1/packets/:id ────────────────────────────────────────────────────

export const GetPacketResponseSchema = z.object({
  packet: PacketSchema,
  items: z.array(PacketItemSchema),
});
export type GetPacketResponse = z.infer<typeof GetPacketResponseSchema>;

import { z } from 'zod';
import {
  EvidenceItemSchema,
  EvidenceItemUpsertSchema,
} from '../schemas/evidence-item.js';
import { paginated, PaginationRequestSchema } from './_common.js';
import { EvidenceTypeValues } from '../enums.js';

// ─── PUT /v1/exceptions/:id/evidence/:evidence_type ─────────────────────────

export const UpsertEvidenceRequestSchema = EvidenceItemUpsertSchema;
export type UpsertEvidenceRequest = z.infer<typeof UpsertEvidenceRequestSchema>;

export const UpsertEvidenceResponseSchema = EvidenceItemSchema;
export type UpsertEvidenceResponse = z.infer<typeof UpsertEvidenceResponseSchema>;

// ─── POST /v1/exceptions/:id/evidence/:evidence_type/waive ──────────────────

export const WaiveEvidenceRequestSchema = z.object({
  evidence_type: z.enum(EvidenceTypeValues),
  reason: z.string().min(1),
});
export type WaiveEvidenceRequest = z.infer<typeof WaiveEvidenceRequestSchema>;

export const WaiveEvidenceResponseSchema = EvidenceItemSchema;
export type WaiveEvidenceResponse = z.infer<typeof WaiveEvidenceResponseSchema>;

// ─── GET /v1/exceptions/:id/evidence ────────────────────────────────────────

export const ListEvidenceQuerySchema = PaginationRequestSchema;
export type ListEvidenceQuery = z.infer<typeof ListEvidenceQuerySchema>;

export const ListEvidenceResponseSchema = paginated(EvidenceItemSchema);
export type ListEvidenceResponse = z.infer<typeof ListEvidenceResponseSchema>;

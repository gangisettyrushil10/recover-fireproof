import { z } from 'zod';
import {
  LegalHoldCreateSchema,
  LegalHoldSchema,
} from '../schemas/legal-hold.js';
import { paginated, PaginationRequestSchema } from './_common.js';
import { HoldStatusValues } from '../enums.js';
import { EntityRefSchema } from '../schemas/_primitives.js';

// ─── POST /v1/legal-holds ───────────────────────────────────────────────────

export const CreateLegalHoldRequestSchema = LegalHoldCreateSchema;
export type CreateLegalHoldRequest = z.infer<typeof CreateLegalHoldRequestSchema>;

export const CreateLegalHoldResponseSchema = LegalHoldSchema;
export type CreateLegalHoldResponse = z.infer<typeof CreateLegalHoldResponseSchema>;

// ─── POST /v1/legal-holds/:id/activate ──────────────────────────────────────

export const ActivateLegalHoldRequestSchema = z.object({
  /** Add subjects atomically with activation, if needed. */
  add_subjects: z.array(EntityRefSchema).optional(),
});
export type ActivateLegalHoldRequest = z.infer<typeof ActivateLegalHoldRequestSchema>;

export const ActivateLegalHoldResponseSchema = LegalHoldSchema;
export type ActivateLegalHoldResponse = z.infer<typeof ActivateLegalHoldResponseSchema>;

// ─── POST /v1/legal-holds/:id/release ───────────────────────────────────────

export const ReleaseLegalHoldRequestSchema = z.object({
  reason: z.string().min(1),
});
export type ReleaseLegalHoldRequest = z.infer<typeof ReleaseLegalHoldRequestSchema>;

export const ReleaseLegalHoldResponseSchema = LegalHoldSchema;
export type ReleaseLegalHoldResponse = z.infer<typeof ReleaseLegalHoldResponseSchema>;

// ─── GET /v1/legal-holds ────────────────────────────────────────────────────

export const ListLegalHoldsQuerySchema = PaginationRequestSchema.extend({
  status: z.enum(HoldStatusValues).optional(),
});
export type ListLegalHoldsQuery = z.infer<typeof ListLegalHoldsQuerySchema>;

export const ListLegalHoldsResponseSchema = paginated(LegalHoldSchema);
export type ListLegalHoldsResponse = z.infer<typeof ListLegalHoldsResponseSchema>;

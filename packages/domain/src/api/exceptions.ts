import { z } from 'zod';
import { ExceptionTypeValues, SeverityValues } from '../enums.js';
import {
  ExceptionCreateSchema,
  ExceptionSchema,
} from '../schemas/exception.js';
import { paginated, PaginationRequestSchema } from './_common.js';
import {
  AssetIdentityStateValues,
  CarrierRecommendationStateValues,
  DeficiencyStateValues,
  ImpairmentStateValues,
} from '../states.js';
import { MetadataSchema } from '../schemas/_primitives.js';

// ─── POST /v1/exceptions ────────────────────────────────────────────────────

export const CreateExceptionRequestSchema = ExceptionCreateSchema;
export type CreateExceptionRequest = z.infer<typeof CreateExceptionRequestSchema>;

export const CreateExceptionResponseSchema = ExceptionSchema;
export type CreateExceptionResponse = z.infer<typeof CreateExceptionResponseSchema>;

// ─── GET /v1/exceptions ─────────────────────────────────────────────────────

export const ListExceptionsQuerySchema = PaginationRequestSchema.extend({
  type: z.enum(ExceptionTypeValues).optional(),
  severity: z.enum(SeverityValues).optional(),
  property_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  open_only: z.boolean().optional(),
});
export type ListExceptionsQuery = z.infer<typeof ListExceptionsQuerySchema>;

export const ListExceptionsResponseSchema = paginated(ExceptionSchema);
export type ListExceptionsResponse = z.infer<typeof ListExceptionsResponseSchema>;

// ─── POST /v1/exceptions/:id/transitions ────────────────────────────────────

const AnyStateValues = [
  ...ImpairmentStateValues,
  ...DeficiencyStateValues,
  ...CarrierRecommendationStateValues,
  ...AssetIdentityStateValues,
] as const;

export const TransitionExceptionRequestSchema = z.object({
  to_state: z.enum(AnyStateValues),
  reason: z.string().nullable().optional(),
  /** Force transitions are reserved for admins; the API enforces RBAC. */
  force: z.boolean().default(false),
  metadata: MetadataSchema.optional(),
});
export type TransitionExceptionRequest = z.infer<typeof TransitionExceptionRequestSchema>;

export const TransitionExceptionResponseSchema = ExceptionSchema;
export type TransitionExceptionResponse = z.infer<typeof TransitionExceptionResponseSchema>;

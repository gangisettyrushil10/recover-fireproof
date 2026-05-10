import { z } from 'zod';
import { DomainErrorCodeValues } from '../errors.js';
import { IsoDateTimeSchema } from '../schemas/_primitives.js';

/** Standard error envelope for non-2xx responses. */
export const ApiErrorSchema = z.object({
  code: z.enum(DomainErrorCodeValues),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
  request_id: z.string().nullable().optional(),
  occurred_at: IsoDateTimeSchema.optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Cursor-based pagination request piece. Combine with endpoint-specific filters. */
export const PaginationRequestSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().positive().max(200).default(50),
});
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

/** Cursor-based pagination response wrapper. */
export function paginated<T extends z.ZodTypeAny>(
  item: T,
): z.ZodObject<{
  items: z.ZodArray<T>;
  next_cursor: z.ZodNullable<z.ZodString>;
}> {
  return z.object({
    items: z.array(item),
    next_cursor: z.string().nullable(),
  });
}

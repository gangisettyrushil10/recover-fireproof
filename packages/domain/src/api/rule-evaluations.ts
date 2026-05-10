import { z } from 'zod';
import { RuleEvaluationSchema } from '../schemas/rule-evaluation.js';
import { paginated, PaginationRequestSchema } from './_common.js';

// ─── POST /v1/rule-evaluations/run ──────────────────────────────────────────

export const RunRuleEvaluationRequestSchema = z.object({
  exception_id: z.string().uuid(),
  /** When true, persist the resulting evaluation; otherwise return it ephemerally. */
  persist: z.boolean().default(true),
});
export type RunRuleEvaluationRequest = z.infer<typeof RunRuleEvaluationRequestSchema>;

export const RunRuleEvaluationResponseSchema = RuleEvaluationSchema;
export type RunRuleEvaluationResponse = z.infer<typeof RunRuleEvaluationResponseSchema>;

// ─── GET /v1/rule-evaluations ───────────────────────────────────────────────

export const ListRuleEvaluationsQuerySchema = PaginationRequestSchema.extend({
  exception_id: z.string().uuid().optional(),
});
export type ListRuleEvaluationsQuery = z.infer<typeof ListRuleEvaluationsQuerySchema>;

export const ListRuleEvaluationsResponseSchema = paginated(RuleEvaluationSchema);
export type ListRuleEvaluationsResponse = z.infer<typeof ListRuleEvaluationsResponseSchema>;

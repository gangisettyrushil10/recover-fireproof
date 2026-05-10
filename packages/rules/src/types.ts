/**
 * `@fireproof/rules/types` — engine-specific rule shapes.
 *
 * These are intentionally distinct from `@fireproof/domain`'s `RulePack`
 * row schema (which describes the `rule_packs` DB table). The engine works
 * with its own evaluable `Rule` / `RulePack` shape: a list of typed
 * conditions plus a list of evidence requirements that the evaluator can
 * resolve into a `RuleEvaluationResult`.
 */

import { z } from 'zod';
import {
  EvidenceTypeValues,
  ExceptionTypeValues,
  JurisdictionConfidenceValues,
  SeverityValues,
} from '@fireproof/domain/enums';
import type {
  EvidenceType,
  ExceptionType,
  JurisdictionConfidence,
  Severity,
} from '@fireproof/domain/enums';

// ─────────────────────────────────────────────────────────────────────────────
// System class — engine-level taxonomy used by rule conditions.
//
// This is broader than the DB's `SystemKind` (which distinguishes wet/dry
// sprinkler etc.) — rules typically care about the "class" only.
// ─────────────────────────────────────────────────────────────────────────────

export const SystemClassValues = [
  'sprinkler',
  'standpipe',
  'fire_pump',
  'water_supply',
  'fire_alarm',
  'suppression',
  'extinguisher',
  'other',
] as const;
export type SystemClass = (typeof SystemClassValues)[number];

export const SystemClassSchema = z.enum(SystemClassValues);

// ─────────────────────────────────────────────────────────────────────────────
// Severity ordering (for `severity_gte` conditions)
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  medium_high: 2,
  high: 3,
  critical: 4,
};

export function severityRank(s: Severity): number {
  return SEVERITY_RANK[s];
}

// ─────────────────────────────────────────────────────────────────────────────
// RuleCondition — discriminated by `kind`
// ─────────────────────────────────────────────────────────────────────────────

export const RuleConditionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('system_class_in'),
    values: z.array(SystemClassSchema).min(1),
  }),
  z.object({
    kind: z.literal('system_class_eq'),
    value: SystemClassSchema,
  }),
  z.object({
    kind: z.literal('duration_minutes_gte'),
    minutes: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('severity_gte'),
    severity: z.enum(SeverityValues),
  }),
  z.object({
    kind: z.literal('exception_type_eq'),
    type: z.enum(ExceptionTypeValues),
  }),
  z.object({
    kind: z.literal('always'),
  }),
]);
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RuleRequirement — engine-specific (NOT the DB row in `@fireproof/domain`)
// ─────────────────────────────────────────────────────────────────────────────

export const CardinalityValues = ['one', 'many', 'none'] as const;
export type Cardinality = (typeof CardinalityValues)[number];
export const CardinalitySchema = z.enum(CardinalityValues);

export const RuleRequirementSchema = z.object({
  evidence_type: z.enum(EvidenceTypeValues),
  cardinality: CardinalitySchema,
  required: z.boolean(),
  /**
   * For `notification_proof` requirements: which targets must be notified.
   * E.g., ["AHJ"], ["customer"], ["AHJ", "insurer"].
   */
  notification_targets: z.array(z.string().min(1)).optional(),
});
export type RuleRequirement = z.infer<typeof RuleRequirementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Rule
// ─────────────────────────────────────────────────────────────────────────────

export const RuleStatusValues = ['active', 'disabled', 'unspecified'] as const;
export type RuleStatus = (typeof RuleStatusValues)[number];
export const RuleStatusSchema = z.enum(RuleStatusValues);

/**
 * A `blocksClosureUntil` entry is a string like `ahj_notification.valid` —
 * an `<evidence_type>.<status>` pair that the API evidence validator
 * resolves against actual evidence rows. Stored as a freeform string so
 * future status keywords (e.g. `signed`) can be added without a schema bump.
 */
const BlockingClosureKeySchema = z
  .string()
  .min(3)
  .regex(/^[a-z_]+\.[a-z_]+$/, {
    message: 'must be <evidence_type>.<status>, lowercase snake_case',
  });

/**
 * Accepts either a full ISO 8601 datetime (with offset) or a YYYY-MM-DD date.
 * Mirrors the convention used in `@fireproof/domain`'s `IsoDateSchema`.
 */
const RuleDateSchema = z
  .string()
  .refine(
    (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) ||
      z.string().datetime({ offset: true }).safeParse(s).success,
    { message: 'must be YYYY-MM-DD or ISO 8601 datetime with offset' },
  );

export const RuleSchema = z.object({
  id: z.string().min(1),
  jurisdictionId: z.string().min(1),
  exceptionType: z.enum(ExceptionTypeValues),
  version: z.string().min(1),
  effectiveFrom: RuleDateSchema,
  effectiveTo: RuleDateSchema.optional(),
  /** All conditions are AND'd. */
  when: z.array(RuleConditionSchema).min(1),
  requires: z.array(RuleRequirementSchema),
  blocksClosureUntil: z.array(BlockingClosureKeySchema),
  sourceNote: z.string().min(1),
  status: RuleStatusSchema,
});
export type Rule = z.infer<typeof RuleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RulePack (engine-specific — distinct from `@fireproof/domain`'s DB row)
// ─────────────────────────────────────────────────────────────────────────────

export const RulePackSchema = z.object({
  id: z.string().min(1),
  jurisdictionId: z.string().min(1),
  version: z.string().min(1),
  effectiveFrom: RuleDateSchema,
  effectiveTo: RuleDateSchema.optional(),
  status: RuleStatusSchema,
  /** Source confidence — see PRD jurisdiction seeds table. */
  confidence: z.enum(JurisdictionConfidenceValues),
  sourceNote: z.string().min(1),
  rules: z.array(RuleSchema),
});
export type RulePack = z.infer<typeof RulePackSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RuleEvaluationContext / RuleEvaluationResult
// ─────────────────────────────────────────────────────────────────────────────

export interface RuleEvaluationContext {
  exception: {
    id: string;
    type: ExceptionType;
    state: string;
    severity: Severity;
    openedAt: Date;
    closedAt?: Date;
  };
  system: {
    systemClass: SystemClass;
  };
  property: {
    jurisdictionId: string;
  };
  now: Date;
  durationMinutes: number;
}

export const RuleEvaluationContextSchema = z.object({
  exception: z.object({
    id: z.string().min(1),
    type: z.enum(ExceptionTypeValues),
    state: z.string().min(1),
    severity: z.enum(SeverityValues),
    openedAt: z.date(),
    closedAt: z.date().optional(),
  }),
  system: z.object({
    systemClass: SystemClassSchema,
  }),
  property: z.object({
    jurisdictionId: z.string().min(1),
  }),
  now: z.date(),
  durationMinutes: z.number().nonnegative(),
});

export interface RuleRequirementResult {
  evidence_type: EvidenceType;
  required: boolean;
  cardinality: Cardinality;
  source_rule_id: string;
  notification_targets?: string[];
}

export interface RuleEvaluationConfidenceSummary {
  high: number;
  medium: number;
  low_inferred: number;
}

export interface RuleEvaluationUnspecified {
  ruleId: string;
  reason: string;
}

export interface RuleEvaluationResult {
  rulePackId: string;
  evaluatedAt: Date;
  requirements: RuleRequirementResult[];
  blocking: string[];
  warnings: string[];
  confidenceSummary: RuleEvaluationConfidenceSummary;
  unspecified: RuleEvaluationUnspecified[];
}

export const RuleRequirementResultSchema = z.object({
  evidence_type: z.enum(EvidenceTypeValues),
  required: z.boolean(),
  cardinality: CardinalitySchema,
  source_rule_id: z.string().min(1),
  notification_targets: z.array(z.string().min(1)).optional(),
});

export const RuleEvaluationConfidenceSummarySchema = z.object({
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low_inferred: z.number().int().nonnegative(),
});

export const RuleEvaluationUnspecifiedSchema = z.object({
  ruleId: z.string().min(1),
  reason: z.string().min(1),
});

export const RuleEvaluationResultSchema = z.object({
  rulePackId: z.string().min(1),
  evaluatedAt: z.date(),
  requirements: z.array(RuleRequirementResultSchema),
  blocking: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
  confidenceSummary: RuleEvaluationConfidenceSummarySchema,
  unspecified: z.array(RuleEvaluationUnspecifiedSchema),
});

// Re-export the domain types we use, so consumers can import everything
// from `@fireproof/rules/types` without reaching into `@fireproof/domain`.
export type {
  EvidenceType,
  ExceptionType,
  JurisdictionConfidence,
  Severity,
} from '@fireproof/domain/enums';

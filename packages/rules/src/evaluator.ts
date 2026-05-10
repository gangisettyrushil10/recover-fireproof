/**
 * `@fireproof/rules/evaluator` — pure rule evaluation.
 *
 * Given a `RulePack` and a `RuleEvaluationContext`, produce a
 * `RuleEvaluationResult` describing which evidence requirements apply,
 * which keys block closure, and any warnings or unspecified-rule
 * surfacings. No I/O, no DB, no HTTP.
 */

import { severityRank } from './types.js';
import type {
  Cardinality,
  Rule,
  RuleCondition,
  RuleEvaluationConfidenceSummary,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleEvaluationUnspecified,
  RulePack,
  RuleRequirement,
  RuleRequirementResult,
} from './types.js';
import type { EvidenceType } from '@fireproof/domain/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseRuleDate(value: string): Date {
  // Accepts both `YYYY-MM-DD` (ISO date) and full ISO 8601 datetimes.
  // For a date-only string, `new Date(...)` parses as UTC midnight which is
  // fine for an effective-from window check.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid rule date: ${value}`);
  }
  return parsed;
}

function isWithinEffectiveWindow(rule: Rule, now: Date): boolean {
  const from = parseRuleDate(rule.effectiveFrom);
  if (now < from) return false;
  if (rule.effectiveTo !== undefined) {
    const to = parseRuleDate(rule.effectiveTo);
    if (now > to) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition matching
// ─────────────────────────────────────────────────────────────────────────────

function conditionMatches(
  condition: RuleCondition,
  ctx: RuleEvaluationContext,
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'system_class_in':
      return condition.values.includes(ctx.system.systemClass);
    case 'system_class_eq':
      return ctx.system.systemClass === condition.value;
    case 'duration_minutes_gte':
      return ctx.durationMinutes >= condition.minutes;
    case 'severity_gte':
      return severityRank(ctx.exception.severity) >= severityRank(condition.severity);
    case 'exception_type_eq':
      return ctx.exception.type === condition.type;
  }
}

function ruleMatches(rule: Rule, ctx: RuleEvaluationContext): boolean {
  if (rule.exceptionType !== ctx.exception.type) return false;
  if (!isWithinEffectiveWindow(rule, ctx.now)) return false;
  return rule.when.every((cond) => conditionMatches(cond, ctx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement aggregation
// ─────────────────────────────────────────────────────────────────────────────

interface AccumulatedRequirement {
  evidence_type: EvidenceType;
  required: boolean;
  cardinality: Cardinality;
  source_rule_id: string;
  notification_targets?: string[];
}

function mergeRequirement(
  acc: Map<EvidenceType, AccumulatedRequirement>,
  rule: Rule,
  req: RuleRequirement,
): void {
  const existing = acc.get(req.evidence_type);
  if (!existing) {
    acc.set(req.evidence_type, {
      evidence_type: req.evidence_type,
      required: req.required,
      cardinality: req.cardinality,
      source_rule_id: rule.id,
      notification_targets: req.notification_targets
        ? [...req.notification_targets]
        : undefined,
    });
    return;
  }
  // Required if ANY matched rule says required.
  existing.required = existing.required || req.required;
  // Union notification targets.
  if (req.notification_targets && req.notification_targets.length > 0) {
    const merged = new Set<string>(existing.notification_targets ?? []);
    for (const target of req.notification_targets) merged.add(target);
    existing.notification_targets = Array.from(merged);
  }
  // Cardinality: prefer the more permissive ("many" wins over "one" wins
  // over "none"). This matches "if any rule needs many, we must allow many".
  existing.cardinality = mergeCardinality(existing.cardinality, req.cardinality);
}

function cardinalityRank(c: Cardinality): number {
  switch (c) {
    case 'none':
      return 0;
    case 'one':
      return 1;
    case 'many':
      return 2;
  }
}

function mergeCardinality(a: Cardinality, b: Cardinality): Cardinality {
  return cardinalityRank(a) >= cardinalityRank(b) ? a : b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence summary
// ─────────────────────────────────────────────────────────────────────────────

function buildConfidenceSummary(
  pack: RulePack,
): RuleEvaluationConfidenceSummary {
  const summary: RuleEvaluationConfidenceSummary = {
    high: 0,
    medium: 0,
    low_inferred: 0,
  };
  switch (pack.confidence) {
    case 'high':
      summary.high = 1;
      break;
    case 'medium':
      summary.medium = 1;
      break;
    case 'low_inferred':
      summary.low_inferred = 1;
      break;
  }
  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateRules(
  pack: RulePack,
  ctx: RuleEvaluationContext,
): RuleEvaluationResult {
  const evaluatedAt = ctx.now;
  const warnings: string[] = [];
  const unspecified: RuleEvaluationUnspecified[] = [];
  const acc = new Map<EvidenceType, AccumulatedRequirement>();
  const blocking = new Set<string>();

  // If the entire pack is disabled, surface a single warning and return
  // a result with no requirements/blockers — but still preserve the
  // confidence summary so callers can show that we checked.
  if (pack.status === 'disabled') {
    warnings.push('rule_pack_disabled');
  }

  let matchedActive = 0;
  let matchedAny = 0;

  for (const rule of pack.rules) {
    if (!ruleMatches(rule, ctx)) continue;
    matchedAny++;

    if (rule.status === 'disabled') {
      // Disabled rules are completely inert.
      continue;
    }

    if (rule.status === 'unspecified') {
      unspecified.push({
        ruleId: rule.id,
        reason: rule.sourceNote,
      });
      warnings.push(`unspecified_rule:${rule.id}`);
      continue;
    }

    // Active rule: aggregate.
    if (pack.status === 'disabled') {
      // Pack disabled overrides individual active rules — don't block,
      // but surface as unspecified for visibility.
      unspecified.push({
        ruleId: rule.id,
        reason: 'rule_pack_disabled',
      });
      warnings.push(`pack_disabled_skipped_rule:${rule.id}`);
      continue;
    }

    matchedActive++;
    for (const req of rule.requires) {
      mergeRequirement(acc, rule, req);
    }
    for (const key of rule.blocksClosureUntil) {
      blocking.add(key);
    }
  }

  if (matchedAny === 0) {
    warnings.push('no_active_rules_for_context');
  }
  // Suppress unused-var warnings on `matchedActive` — kept for clarity and
  // future telemetry hooks.
  void matchedActive;

  const requirements: RuleRequirementResult[] = Array.from(acc.values()).map(
    (r) => ({
      evidence_type: r.evidence_type,
      required: r.required,
      cardinality: r.cardinality,
      source_rule_id: r.source_rule_id,
      ...(r.notification_targets && r.notification_targets.length > 0
        ? { notification_targets: r.notification_targets }
        : {}),
    }),
  );

  return {
    rulePackId: pack.id,
    evaluatedAt,
    requirements,
    blocking: Array.from(blocking),
    warnings,
    confidenceSummary: buildConfidenceSummary(pack),
    unspecified,
  };
}

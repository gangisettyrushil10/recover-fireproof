/**
 * Allowed state-transition edges per exception type, and the
 * `isAllowedTransition` helper.
 *
 * The maps are intentionally exhaustive: any state listed as a key, even
 * a terminal one, must appear (with `[]` if no outbound transitions). This
 * lets the API and rules engine treat "unknown state" as a hard error.
 */

import type { ExceptionType } from './enums.js';
import type {
  AssetIdentityState,
  CarrierRecommendationState,
  DeficiencyState,
  ImpairmentState,
  StateOf,
} from './states.js';

// ─────────────────────────────────────────────────────────────────────────────
// Impairment transitions
// ─────────────────────────────────────────────────────────────────────────────

export const ImpairmentTransitions: Record<ImpairmentState, ImpairmentState[]> = {
  draft: ['active', 'voided'],
  active: ['safeguards_pending', 'repair_in_progress', 'voided', 'escalated'],
  safeguards_pending: ['repair_in_progress', 'escalated', 'voided'],
  repair_in_progress: ['restoration_testing_required', 'escalated', 'voided'],
  restoration_testing_required: [
    'restored_evidence_incomplete',
    'closed_audit_ready',
    'escalated',
  ],
  restored_evidence_incomplete: ['closed_audit_ready', 'escalated'],
  closed_audit_ready: [],
  escalated: ['active', 'closed_audit_ready', 'voided'],
  voided: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Deficiency transitions
// ─────────────────────────────────────────────────────────────────────────────

export const DeficiencyTransitions: Record<DeficiencyState, DeficiencyState[]> = {
  detected: ['proposal_pending', 'declined_risk_accepted', 'escalated'],
  proposal_pending: ['customer_response_pending', 'escalated'],
  customer_response_pending: [
    'approved_for_repair',
    'declined_risk_accepted',
    'escalated',
  ],
  approved_for_repair: ['repair_in_progress', 'escalated'],
  repair_in_progress: ['verification_pending', 'escalated'],
  verification_pending: ['closed_verified', 'escalated'],
  closed_verified: [],
  declined_risk_accepted: [],
  escalated: ['detected', 'approved_for_repair', 'closed_verified'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Carrier recommendation transitions
// ─────────────────────────────────────────────────────────────────────────────

export const CarrierRecommendationTransitions: Record<
  CarrierRecommendationState,
  CarrierRecommendationState[]
> = {
  imported: ['acknowledged', 'waived'],
  acknowledged: ['assigned', 'waived'],
  assigned: ['in_progress', 'overdue', 'waived'],
  in_progress: ['evidence_pending', 'overdue', 'waived'],
  evidence_pending: ['closed_verified', 'overdue', 'waived'],
  overdue: ['in_progress', 'evidence_pending', 'closed_verified', 'waived'],
  closed_verified: [],
  waived: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Asset identity transitions
// ─────────────────────────────────────────────────────────────────────────────

export const AssetIdentityTransitions: Record<AssetIdentityState, AssetIdentityState[]> = {
  detected: ['verification_pending', 'escalated'],
  verification_pending: ['reconciled', 'replacement_pending', 'escalated'],
  reconciled: ['retest_pending', 'closed_verified'],
  replacement_pending: ['retest_pending', 'escalated'],
  retest_pending: ['closed_verified', 'escalated'],
  closed_verified: [],
  escalated: ['detected', 'verification_pending', 'reconciled', 'replacement_pending'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Combined map keyed by ExceptionType
// ─────────────────────────────────────────────────────────────────────────────

export const TransitionsByType = {
  impairment: ImpairmentTransitions,
  deficiency: DeficiencyTransitions,
  carrier_recommendation: CarrierRecommendationTransitions,
  asset_identity: AssetIdentityTransitions,
} as const;

/**
 * Returns true iff `from → to` is an allowed transition for the given
 * exception type. Returns false if either state is unknown for the type.
 */
export function isAllowedTransition<T extends ExceptionType>(
  type: T,
  from: StateOf<T>,
  to: StateOf<T>,
): boolean {
  const map = TransitionsByType[type] as Record<string, string[]> | undefined;
  if (!map) return false;
  const next = map[from as string];
  if (!next) return false;
  return next.includes(to as string);
}

/**
 * Returns the list of allowed next states for `(type, from)`, or an empty
 * array if `from` is unknown. The array is a fresh copy — safe to mutate.
 */
export function allowedNextStates<T extends ExceptionType>(
  type: T,
  from: StateOf<T>,
): StateOf<T>[] {
  const map = TransitionsByType[type] as Record<string, string[]> | undefined;
  if (!map) return [];
  const next = map[from as string];
  if (!next) return [];
  return [...next] as StateOf<T>[];
}

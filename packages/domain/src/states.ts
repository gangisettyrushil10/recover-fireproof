/**
 * Per-exception-type lifecycle state enums and the discriminated `ExceptionState`
 * union that other packages use when reasoning about transitions.
 */

import type { ExceptionType } from './enums.js';

// ─────────────────────────────────────────────────────────────────────────────
// Impairment
// ─────────────────────────────────────────────────────────────────────────────

export const ImpairmentStateValues = [
  'draft',
  'active',
  'safeguards_pending',
  'repair_in_progress',
  'restoration_testing_required',
  'restored_evidence_incomplete',
  'closed_audit_ready',
  'escalated',
  'voided',
] as const;
export type ImpairmentState = (typeof ImpairmentStateValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Deficiency
// ─────────────────────────────────────────────────────────────────────────────

export const DeficiencyStateValues = [
  'detected',
  'proposal_pending',
  'customer_response_pending',
  'approved_for_repair',
  'repair_in_progress',
  'verification_pending',
  'closed_verified',
  'declined_risk_accepted',
  'escalated',
] as const;
export type DeficiencyState = (typeof DeficiencyStateValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Carrier recommendation
// ─────────────────────────────────────────────────────────────────────────────

export const CarrierRecommendationStateValues = [
  'imported',
  'acknowledged',
  'assigned',
  'in_progress',
  'evidence_pending',
  'closed_verified',
  'overdue',
  'waived',
] as const;
export type CarrierRecommendationState =
  (typeof CarrierRecommendationStateValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Asset identity
// ─────────────────────────────────────────────────────────────────────────────

export const AssetIdentityStateValues = [
  'detected',
  'verification_pending',
  'reconciled',
  'replacement_pending',
  'retest_pending',
  'closed_verified',
  'escalated',
] as const;
export type AssetIdentityState = (typeof AssetIdentityStateValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union
// ─────────────────────────────────────────────────────────────────────────────

export type ExceptionState =
  | { type: 'impairment'; state: ImpairmentState }
  | { type: 'deficiency'; state: DeficiencyState }
  | { type: 'carrier_recommendation'; state: CarrierRecommendationState }
  | { type: 'asset_identity'; state: AssetIdentityState };

/**
 * Map of exception type → tuple of valid states. Useful when you need to
 * validate an arbitrary `(type, state)` pair from external input.
 */
export const StatesByType = {
  impairment: ImpairmentStateValues,
  deficiency: DeficiencyStateValues,
  carrier_recommendation: CarrierRecommendationStateValues,
  asset_identity: AssetIdentityStateValues,
} as const satisfies Record<ExceptionType, readonly string[]>;

/**
 * `StateOf<'impairment'>` → `ImpairmentState`, etc. Used by transitions and
 * by API request schemas.
 */
export type StateOf<T extends ExceptionType> = T extends 'impairment'
  ? ImpairmentState
  : T extends 'deficiency'
    ? DeficiencyState
    : T extends 'carrier_recommendation'
      ? CarrierRecommendationState
      : T extends 'asset_identity'
        ? AssetIdentityState
        : never;

/**
 * Shared fixtures for the rule engine tests. Models the Cedar Heights
 * Day -116 impairment (`exc_imp_0116`) — sprinkler, 350-minute duration,
 * Hartwell jurisdiction.
 */

import type { RuleEvaluationContext } from '../src/types.js';

export const CEDAR_HEIGHTS_OPENED = new Date('2026-01-05T07:40:00-05:00');
// 350 minutes after open = 13:30 EST
export const CEDAR_HEIGHTS_NOW = new Date('2026-01-05T13:30:00-05:00');

export function cedarHeightsImpairmentContext(
  overrides: Partial<RuleEvaluationContext> = {},
): RuleEvaluationContext {
  const base: RuleEvaluationContext = {
    exception: {
      id: 'exc_imp_0116',
      type: 'impairment',
      state: 'restored_evidence_incomplete',
      severity: 'critical',
      openedAt: CEDAR_HEIGHTS_OPENED,
    },
    system: {
      systemClass: 'sprinkler',
    },
    property: {
      jurisdictionId: 'jur_hartwell',
    },
    now: CEDAR_HEIGHTS_NOW,
    durationMinutes: 350,
  };
  return {
    ...base,
    ...overrides,
    exception: { ...base.exception, ...(overrides.exception ?? {}) },
    system: { ...base.system, ...(overrides.system ?? {}) },
    property: { ...base.property, ...(overrides.property ?? {}) },
  };
}

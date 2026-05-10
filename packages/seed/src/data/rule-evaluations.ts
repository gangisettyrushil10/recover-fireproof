/**
 * Pre-computed rule evaluation snapshots for each Cedar Heights exception.
 *
 * Computed from `@fireproof/rules` + the seeded exceptions so the API can
 * return blockers immediately on dashboard load without re-running the
 * evaluator.
 */

import { evaluateRules, packForJurisdiction } from '@fireproof/rules';
import { DEFAULT_ORG_ID } from './organizations.js';
import { EXCEPTIONS, type SeedException } from './exceptions.js';
import { SYSTEM_SLUGS } from '../ids.js';
import { stableId } from '../util.js';

export interface SeedRuleEvaluation {
  slug: string;
  id: string;
  organizationId: string;
  exceptionId: string;
  rulePackId: string;
  ruleBindingId: string | null;
  requirementsJson: unknown[];
  blockingJson: unknown[];
  isSatisfied: boolean;
  evaluatedAt: Date;
  metadata: Record<string, unknown>;
}

type SystemClass =
  | 'sprinkler'
  | 'standpipe'
  | 'fire_pump'
  | 'water_supply'
  | 'fire_alarm'
  | 'suppression'
  | 'extinguisher'
  | 'other';

const SYSTEM_CLASS_BY_ID: Record<string, SystemClass> = {
  [stableId(SYSTEM_SLUGS.sprinkler9)]: 'sprinkler',
  [stableId(SYSTEM_SLUGS.standpipe9w)]: 'standpipe',
  [stableId(SYSTEM_SLUGS.firePump)]: 'fire_pump',
  [stableId(SYSTEM_SLUGS.alarmPanel)]: 'fire_alarm',
  [stableId(SYSTEM_SLUGS.fdc)]: 'other',
};

function computeForException(e: SeedException): SeedRuleEvaluation {
  const pack = packForJurisdiction('jur_hartwell');
  if (!pack) throw new Error('Hartwell rule pack missing');
  const durationMinutes = (e.metadata as { reportedDurationMinutes?: number })
    .reportedDurationMinutes ?? 0;
  const result = evaluateRules(pack, {
    exception: {
      id: e.id,
      type: e.type,
      state: e.state,
      severity: e.severity,
      openedAt: e.openedAt,
      closedAt: e.closedAt ?? undefined,
    },
    system: {
      systemClass: e.systemId ? (SYSTEM_CLASS_BY_ID[e.systemId] ?? 'other') : 'other',
    },
    property: { jurisdictionId: 'jur_hartwell' },
    now: new Date(),
    durationMinutes,
  });
  // The rules engine outputs are already serializable. We map blocking strings
  // (e.g. `ahj_notification.valid`) into the API's expected blocking shape:
  //   `{ key, evidence_type, blocking, satisfied }`
  const blocking = result.blocking.map((key) => {
    const [evidenceType] = key.split('.');
    return {
      key,
      evidence_type: evidenceType,
      blocking: true,
      satisfied: false,
    };
  });
  return {
    slug: `re_${e.slug}`,
    id: stableId(`re_${e.slug}`),
    organizationId: DEFAULT_ORG_ID,
    exceptionId: e.id,
    rulePackId: e.rulePackId ?? stableId('rule_pack_hartwell_v1'),
    ruleBindingId: null,
    requirementsJson: result.requirements as unknown as unknown[],
    blockingJson: blocking,
    isSatisfied: blocking.length === 0,
    evaluatedAt: new Date(),
    metadata: {
      warnings: result.warnings,
      unspecified: result.unspecified,
      confidenceSummary: result.confidenceSummary,
    },
  };
}

export const RULE_EVALUATIONS: SeedRuleEvaluation[] = EXCEPTIONS.map(computeForException);

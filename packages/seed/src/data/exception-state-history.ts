/**
 * Realistic state-history rows leading up to each exception's current state.
 * One row per transition; `from_state` is null for the initial creation.
 */

import { EXCEPTION_SLUGS, USER_SLUGS } from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { dayOffset, stableId } from '../util.js';

export interface SeedStateHistory {
  slug: string;
  id: string;
  organizationId: string;
  exceptionId: string;
  fromState: string | null;
  toState: string;
  changedByUserId: string | null;
  reason: string | null;
  detail: Record<string, unknown>;
  occurredAt: Date;
}

const lpark = stableId(USER_SLUGS.lpark);
const mdisalvo = stableId(USER_SLUGS.mdisalvo);

interface Transition {
  from: string | null;
  to: string;
  reason: string;
  occurredAt: Date;
  changedBy: string;
}

function buildHistory(slug: string, transitions: Transition[]): SeedStateHistory[] {
  return transitions.map((t, idx) => ({
    slug: `${slug}_history_${idx}`,
    id: stableId(`${slug}_history_${idx}`),
    organizationId: DEFAULT_ORG_ID,
    exceptionId: stableId(slug),
    fromState: t.from,
    toState: t.to,
    changedByUserId: t.changedBy,
    reason: t.reason,
    detail: {},
    occurredAt: t.occurredAt,
  }));
}

export const EXCEPTION_STATE_HISTORY: SeedStateHistory[] = [
  // exc_imp_0116
  ...buildHistory(EXCEPTION_SLUGS.imp0116, [
    { from: null, to: 'draft', reason: 'Created from field report', occurredAt: dayOffset(-116, '07:35:00'), changedBy: mdisalvo },
    { from: 'draft', to: 'active', reason: 'Impairment confirmed in field', occurredAt: dayOffset(-116, '07:40:00'), changedBy: mdisalvo },
    { from: 'active', to: 'repair_in_progress', reason: 'Frozen-pipe repair started', occurredAt: dayOffset(-116, '08:15:00'), changedBy: mdisalvo },
    { from: 'repair_in_progress', to: 'restoration_testing_required', reason: 'Repair complete; restoration testing pending', occurredAt: dayOffset(-116, '12:00:00'), changedBy: mdisalvo },
    { from: 'restoration_testing_required', to: 'restored_evidence_incomplete', reason: 'Pressure good per main drain log; numeric readings missing', occurredAt: dayOffset(-116, '13:30:00'), changedBy: mdisalvo },
  ]),
  // exc_def_9w_corr
  ...buildHistory(EXCEPTION_SLUGS.def9wCorr, [
    { from: null, to: 'detected', reason: 'Corrosion observed on hose connection', occurredAt: dayOffset(-78, '09:00:00'), changedBy: mdisalvo },
    { from: 'detected', to: 'proposal_pending', reason: 'Drafting service proposal', occurredAt: dayOffset(-78, '11:00:00'), changedBy: lpark },
    { from: 'proposal_pending', to: 'customer_response_pending', reason: 'Proposal prop_2026_009 sent to property manager', occurredAt: dayOffset(-77, '15:00:00'), changedBy: lpark },
  ]),
  // exc_carrier_55a
  ...buildHistory(EXCEPTION_SLUGS.carrier55a, [
    { from: null, to: 'imported', reason: 'Imported from Continental loss-control survey', occurredAt: new Date('2025-12-19T09:00:00-05:00'), changedBy: lpark },
    { from: 'imported', to: 'acknowledged', reason: 'Recommendation acknowledged by office manager', occurredAt: new Date('2025-12-22T09:00:00-05:00'), changedBy: lpark },
  ]),
  // exc_asset_battery
  ...buildHistory(EXCEPTION_SLUGS.assetBattery, [
    { from: null, to: 'detected', reason: 'Battery plate photo does not match recorded value', occurredAt: new Date('2026-04-01T09:00:00-04:00'), changedBy: mdisalvo },
    { from: 'detected', to: 'verification_pending', reason: 'Manufacturer/model in records pending verification', occurredAt: new Date('2026-04-02T09:00:00-04:00'), changedBy: lpark },
  ]),
  // exc_pump_perf
  ...buildHistory(EXCEPTION_SLUGS.pumpPerf, [
    { from: null, to: 'detected', reason: 'Pump test shows 18% variance vs prior satisfactory', occurredAt: new Date('2026-03-15T09:00:00-04:00'), changedBy: mdisalvo },
    { from: 'detected', to: 'escalated', reason: 'Variance exceeds tolerance — escalating', occurredAt: new Date('2026-03-15T11:00:00-04:00'), changedBy: lpark },
  ]),
];

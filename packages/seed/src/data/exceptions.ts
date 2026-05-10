/**
 * Five canonical Cedar Heights exceptions. State strings come from
 * `@fireproof/domain/states` per type; severity comes from `SeverityValues`.
 *
 * Date anchors are relative to `FIRE_DAY` (today, 2026-05-09).
 */

import {
  ASSET_SLUGS,
  EXCEPTION_SLUGS,
  JURISDICTION_SLUGS,
  PROPERTY_SLUGS,
  RULE_PACK_SLUGS,
  SYSTEM_SLUGS,
  USER_SLUGS,
} from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { dayOffset, stableId } from '../util.js';

export interface SeedException {
  slug: string;
  id: string;
  organizationId: string;
  propertyId: string;
  systemId: string | null;
  assetId: string | null;
  jurisdictionId: string | null;
  jurisdictionConfidence: 'high' | 'medium' | 'low_inferred' | null;
  type: 'impairment' | 'deficiency' | 'carrier_recommendation' | 'asset_identity';
  state: string;
  severity: 'low' | 'medium' | 'medium_high' | 'high' | 'critical';
  holdStatus: 'none' | 'pending' | 'active' | 'released';
  title: string;
  summary: string | null;
  rulePackId: string | null;
  assignedUserId: string | null;
  reporterUserId: string | null;
  openedAt: Date;
  closedAt: Date | null;
  dueAt: Date | null;
  metadata: Record<string, unknown>;
}

const cedarPropertyId = stableId(PROPERTY_SLUGS.cedar);
const hartwellId = stableId(JURISDICTION_SLUGS.hartwell);
const hartwellPackId = stableId(RULE_PACK_SLUGS.hartwellV1);

export const EXCEPTIONS: SeedException[] = [
  // 1. exc_imp_0116 — Day -116 sprinkler impairment, restored but evidence incomplete.
  {
    slug: EXCEPTION_SLUGS.imp0116,
    id: stableId(EXCEPTION_SLUGS.imp0116),
    organizationId: DEFAULT_ORG_ID,
    propertyId: cedarPropertyId,
    systemId: stableId(SYSTEM_SLUGS.sprinkler9),
    assetId: null,
    jurisdictionId: hartwellId,
    jurisdictionConfidence: 'high',
    type: 'impairment',
    state: 'restored_evidence_incomplete',
    severity: 'critical',
    holdStatus: 'none',
    title: '9th-floor wet sprinkler zone out of service for frozen-pipe repair',
    summary:
      'Frozen-pipe repair on the 9th-floor sprinkler vertical riser; physically restored but evidence (AHJ notification, fire watch, restoration test readings) is incomplete.',
    rulePackId: hartwellPackId,
    assignedUserId: stableId(USER_SLUGS.lpark),
    reporterUserId: stableId(USER_SLUGS.mdisalvo),
    openedAt: dayOffset(-116, '07:40:00'),
    closedAt: null,
    dueAt: null,
    metadata: {
      cause: 'Frozen pipe at vertical riser',
      reportedDurationMinutes: 350,
      notifications: {
        ahj: 'unknown',
        customer: 'reported_in_log',
        insurer: 'unspecified',
      },
    },
  },
  // 2. exc_def_9w_corr — Day -78 standpipe corrosion deficiency, customer non-response.
  {
    slug: EXCEPTION_SLUGS.def9wCorr,
    id: stableId(EXCEPTION_SLUGS.def9wCorr),
    organizationId: DEFAULT_ORG_ID,
    propertyId: cedarPropertyId,
    systemId: stableId(SYSTEM_SLUGS.standpipe9w),
    assetId: null,
    jurisdictionId: hartwellId,
    jurisdictionConfidence: 'high',
    type: 'deficiency',
    state: 'customer_response_pending',
    severity: 'high',
    holdStatus: 'none',
    title: 'Corrosion on 9th-floor west stairwell hose connection',
    summary:
      'Internal email thread flags standpipe corrosion; service proposal sent to customer; awaiting decision.',
    rulePackId: hartwellPackId,
    assignedUserId: stableId(USER_SLUGS.lpark),
    reporterUserId: stableId(USER_SLUGS.mdisalvo),
    openedAt: dayOffset(-78, '10:00:00'),
    closedAt: null,
    dueAt: null,
    metadata: {
      subtype: 'corrosion',
      proposalId: 'prop_2026_009',
    },
  },
  // 3. exc_carrier_55a — carrier recommendation imported well before the fire.
  {
    slug: EXCEPTION_SLUGS.carrier55a,
    id: stableId(EXCEPTION_SLUGS.carrier55a),
    organizationId: DEFAULT_ORG_ID,
    propertyId: cedarPropertyId,
    systemId: stableId(SYSTEM_SLUGS.firePump),
    assetId: stableId(ASSET_SLUGS.pumpMotor),
    jurisdictionId: hartwellId,
    jurisdictionConfidence: 'high',
    type: 'carrier_recommendation',
    state: 'acknowledged',
    severity: 'medium',
    holdStatus: 'none',
    title: 'Continental LC-55A: Fire pump aging — recommend overhaul plan',
    summary:
      'Insurer loss-control survey acknowledged the fire pump as acceptable but aging; carrier recommendation LC-55A logged.',
    rulePackId: hartwellPackId,
    assignedUserId: stableId(USER_SLUGS.lpark),
    reporterUserId: null,
    openedAt: new Date('2025-12-19T09:00:00-05:00'),
    closedAt: null,
    dueAt: null,
    metadata: {
      recommendationCode: 'LC-55A',
      summary: 'Pump aging — recommend overhaul plan',
    },
  },
  // 4. exc_asset_battery — alarm panel battery identity mismatch.
  {
    slug: EXCEPTION_SLUGS.assetBattery,
    id: stableId(EXCEPTION_SLUGS.assetBattery),
    organizationId: DEFAULT_ORG_ID,
    propertyId: cedarPropertyId,
    systemId: stableId(SYSTEM_SLUGS.alarmPanel),
    assetId: stableId(ASSET_SLUGS.batteryInstalled),
    jurisdictionId: hartwellId,
    jurisdictionConfidence: 'high',
    type: 'asset_identity',
    state: 'verification_pending',
    severity: 'medium_high',
    holdStatus: 'none',
    title: 'Alarm panel battery identity mismatch',
    summary:
      'Recorded battery (Eagle-Picher CFM12V18) does not match installed unit (Power-Sonic PS-12180-NB).',
    rulePackId: hartwellPackId,
    assignedUserId: stableId(USER_SLUGS.lpark),
    reporterUserId: stableId(USER_SLUGS.mdisalvo),
    openedAt: new Date('2026-04-01T09:00:00-04:00'),
    closedAt: null,
    dueAt: null,
    metadata: {
      recordedManufacturer: 'Eagle-Picher',
      installedManufacturer: 'Power-Sonic',
    },
  },
  // 5. exc_pump_perf — escalated pump-test variance.
  {
    slug: EXCEPTION_SLUGS.pumpPerf,
    id: stableId(EXCEPTION_SLUGS.pumpPerf),
    organizationId: DEFAULT_ORG_ID,
    propertyId: cedarPropertyId,
    systemId: stableId(SYSTEM_SLUGS.firePump),
    assetId: stableId(ASSET_SLUGS.pumpMotor),
    jurisdictionId: hartwellId,
    jurisdictionConfidence: 'high',
    type: 'deficiency',
    state: 'escalated',
    severity: 'critical',
    holdStatus: 'none',
    title: 'Fire pump performance variance vs prior satisfactory result',
    summary:
      'Pump test shows 18% variance vs prior satisfactory result; escalated for review.',
    rulePackId: hartwellPackId,
    assignedUserId: stableId(USER_SLUGS.lpark),
    reporterUserId: stableId(USER_SLUGS.mdisalvo),
    openedAt: new Date('2026-03-15T09:00:00-04:00'),
    closedAt: null,
    dueAt: null,
    metadata: {
      subtype: 'test_discrepancy',
      priorStatus: 'satisfactory',
      measuredVariancePct: 18,
    },
  },
];

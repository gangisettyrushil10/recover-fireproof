/**
 * Document claims — structured assertions extracted from each seeded document.
 * The contradiction engine consumes these to produce the canonical Cedar
 * Heights conflicts (omitted standpipe deficiency, battery mismatch, etc.).
 *
 * Note: the DB enum `claim_type` is the *normalized* class
 * (impairment_window, fire_watch_interval, restoration_test_result,
 * asset_identity_attribute, notification_event, customer_decision_event,
 * proposal_transmission, other). The legal-export library cares about the
 * narrow `claim_value.kind` payload; the table stores both.
 */

import {
  ASSET_SLUGS,
  DOCUMENT_SLUGS,
  EXCEPTION_SLUGS,
  SYSTEM_SLUGS,
} from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { dayOffset, stableId } from '../util.js';

export interface SeedDocumentClaim {
  slug: string;
  id: string;
  organizationId: string;
  documentVersionSlug: string; // we'll derive version_id from doc slug at orchestrator time
  claimType:
    | 'impairment_window'
    | 'fire_watch_interval'
    | 'restoration_test_result'
    | 'asset_identity_attribute'
    | 'notification_event'
    | 'customer_decision_event'
    | 'proposal_transmission'
    | 'other';
  claimSubjectKind: 'system' | 'asset' | 'exception' | 'property';
  claimSubjectRef: string;
  claimValue: Record<string, unknown>;
  claimTimeRange: { start: string; end: string } | null;
  confidence: number;
  provenance: Record<string, unknown>;
}

const c = (
  slugSuffix: string,
  documentSlug: string,
  claimType: SeedDocumentClaim['claimType'],
  subjectKind: SeedDocumentClaim['claimSubjectKind'],
  subjectSlug: string,
  claimValue: Record<string, unknown>,
  range: { start: string; end: string } | null = null,
): SeedDocumentClaim => {
  const slug = `claim_${documentSlug}_${slugSuffix}`;
  return {
    slug,
    id: stableId(slug),
    organizationId: DEFAULT_ORG_ID,
    documentVersionSlug: documentSlug,
    claimType,
    claimSubjectKind: subjectKind,
    claimSubjectRef: stableId(subjectSlug),
    claimValue,
    claimTimeRange: range,
    confidence: 1.0,
    provenance: { extractor: 'seed' },
  };
};

const periodLong = {
  start: dayOffset(-211, '09:00:00').toISOString(),
  end: dayOffset(0, '00:00:00').toISOString(),
};
const periodCorrosion = {
  start: dayOffset(-78, '00:00:00').toISOString(),
  end: dayOffset(0, '00:00:00').toISOString(),
};

export const DOCUMENT_CLAIMS: SeedDocumentClaim[] = [
  // Quarterly says "satisfactory" / no deficiency on standpipe + pump
  c(
    'standpipe_status_sat',
    DOCUMENT_SLUGS.quarterlyD211,
    'other',
    'system',
    SYSTEM_SLUGS.standpipe9w,
    { kind: 'system_status', value: 'satisfactory' },
    periodLong,
  ),
  c(
    'standpipe_def_false',
    DOCUMENT_SLUGS.quarterlyD211,
    'other',
    'system',
    SYSTEM_SLUGS.standpipe9w,
    { kind: 'deficiency_exists', value: false },
    periodLong,
  ),
  c(
    'pump_status_sat',
    DOCUMENT_SLUGS.quarterlyD211,
    'other',
    'system',
    SYSTEM_SLUGS.firePump,
    { kind: 'system_status', value: 'satisfactory' },
    periodLong,
  ),
  // Internal email contradicts the quarterly report
  c(
    'standpipe_def_true',
    DOCUMENT_SLUGS.emailThreadCorrosion,
    'other',
    'system',
    SYSTEM_SLUGS.standpipe9w,
    { kind: 'deficiency_exists', value: true },
    periodCorrosion,
  ),
  // Day -116 impairment log: AHJ notification unknown, drain done but no values
  c(
    'imp_duration',
    DOCUMENT_SLUGS.impairmentLogD116,
    'impairment_window',
    'exception',
    EXCEPTION_SLUGS.imp0116,
    { kind: 'duration_minutes', value: 350 },
    {
      start: dayOffset(-116, '07:40:00').toISOString(),
      end: dayOffset(-116, '13:30:00').toISOString(),
    },
  ),
  c(
    'imp_notification_unknown',
    DOCUMENT_SLUGS.impairmentLogD116,
    'notification_event',
    'exception',
    EXCEPTION_SLUGS.imp0116,
    { kind: 'notification_sent', value: 'unknown', target: 'AHJ' },
  ),
  c(
    'main_drain_performed',
    DOCUMENT_SLUGS.impairmentLogD116,
    'restoration_test_result',
    'exception',
    EXCEPTION_SLUGS.imp0116,
    { kind: 'main_drain_performed', value: true },
  ),
  c(
    'main_drain_values_missing',
    DOCUMENT_SLUGS.impairmentLogD116,
    'restoration_test_result',
    'exception',
    EXCEPTION_SLUGS.imp0116,
    {
      kind: 'main_drain_values',
      value: { readings_present: false },
    },
  ),
  // Battery identity mismatch — two claims about the same physical slot
  c(
    'battery_installed_manuf',
    DOCUMENT_SLUGS.batteryPhoto,
    'asset_identity_attribute',
    'asset',
    ASSET_SLUGS.batteryInstalled,
    { kind: 'manufacturer', value: 'Power-Sonic' },
  ),
  c(
    'battery_installed_model',
    DOCUMENT_SLUGS.batteryPhoto,
    'asset_identity_attribute',
    'asset',
    ASSET_SLUGS.batteryInstalled,
    { kind: 'model', value: 'PS-12180-NB' },
  ),
  c(
    'battery_recorded_manuf',
    DOCUMENT_SLUGS.batteryPlateRecord,
    'asset_identity_attribute',
    'asset',
    ASSET_SLUGS.batteryRecorded,
    { kind: 'manufacturer', value: 'Eagle-Picher' },
  ),
  c(
    'battery_recorded_model',
    DOCUMENT_SLUGS.batteryPlateRecord,
    'asset_identity_attribute',
    'asset',
    ASSET_SLUGS.batteryRecorded,
    { kind: 'model', value: 'Carefree CFM12V18' },
  ),
  // Pump performance variance
  c(
    'pump_variance_18',
    DOCUMENT_SLUGS.pumpTestPerf,
    'restoration_test_result',
    'system',
    SYSTEM_SLUGS.firePump,
    { kind: 'pump_variance_pct', value: 18 },
  ),
  // Proposal sent → customer non-response
  c(
    'proposal_sent',
    DOCUMENT_SLUGS.proposal2026009,
    'proposal_transmission',
    'exception',
    EXCEPTION_SLUGS.def9wCorr,
    { kind: 'proposal_sent', value: true, proposal_id: 'prop_2026_009' },
  ),
];

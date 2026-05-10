/**
 * Evidence items for each Cedar Heights exception. Mirrors the PRD's
 * "what's missing on Day -116" gaps, so the demo can show blocking errors.
 */

import { DEFAULT_ORG_ID } from './organizations.js';
import { EXCEPTION_SLUGS } from '../ids.js';
import { stableId, dayOffset } from '../util.js';

export interface SeedEvidenceItem {
  slug: string;
  id: string;
  organizationId: string;
  exceptionId: string;
  evidenceType:
    | 'notification_proof'
    | 'fire_watch_record'
    | 'restoration_test_record'
    | 'photo_evidence'
    | 'customer_decision'
    | 'proposal_transmission_proof'
    | 'asset_identity_proof'
    | 'original_source_document'
    | 'counsel_hold_notice';
  status: 'missing' | 'pending' | 'insufficient' | 'valid' | 'waived';
  required: boolean;
  blocking: boolean;
  payload: Record<string, unknown>;
  validationErrors: Array<{ field: string; message: string }>;
  notes: string | null;
  capturedAt: Date | null;
  validatedAt: Date | null;
}

const ev = (
  exceptionSlug: string,
  evidenceType: SeedEvidenceItem['evidenceType'],
  status: SeedEvidenceItem['status'],
  payload: Record<string, unknown>,
  validationErrors: Array<{ field: string; message: string }> = [],
  notes: string | null = null,
  blocking = true,
  required = true,
): SeedEvidenceItem => {
  const slug = `evi_${exceptionSlug}_${evidenceType}`;
  return {
    slug,
    id: stableId(slug),
    organizationId: DEFAULT_ORG_ID,
    exceptionId: stableId(exceptionSlug),
    evidenceType,
    status,
    required,
    blocking,
    payload,
    validationErrors,
    notes,
    capturedAt: status === 'missing' ? null : dayOffset(-115, '13:30:00'),
    validatedAt: status === 'missing' ? null : dayOffset(-115, '14:00:00'),
  };
};

export const EVIDENCE_ITEMS: SeedEvidenceItem[] = [
  // exc_imp_0116 — the 350-min impairment with multiple gaps
  ev(
    EXCEPTION_SLUGS.imp0116,
    'notification_proof',
    'missing',
    { recipient_role: 'AHJ', target: 'AHJ' },
    [{ field: 'timestamp', message: 'AHJ notification not logged.' }],
    'AHJ notification status unknown per handwritten log.',
  ),
  ev(
    EXCEPTION_SLUGS.imp0116,
    'fire_watch_record',
    'insufficient',
    {
      person: 'building staff (informal)',
      provider: 'internal',
      start: dayOffset(-116, '07:50:00').toISOString(),
      end: null,
      area_covered: '9th floor',
    },
    [
      { field: 'end', message: 'Fire watch end timestamp missing.' },
      { field: 'signed_log_document_version_id', message: 'No signed log on file.' },
    ],
    'Fire watch start logged informally; end and signed log missing.',
  ),
  ev(
    EXCEPTION_SLUGS.imp0116,
    'restoration_test_record',
    'insufficient',
    {
      test_type: 'main_drain',
      readings: { static_psi: null, residual_psi: null, readings_present: false },
      performed_by: 'M. DiSalvo',
      performed_at: dayOffset(-115, '13:30:00').toISOString(),
      outcome: 'pressure good',
    },
    [
      { field: 'readings', message: 'Numeric readings required; "pressure good" alone is insufficient.' },
    ],
    'Free-text "pressure good" recorded; numeric main-drain readings absent.',
  ),
  ev(
    EXCEPTION_SLUGS.imp0116,
    'original_source_document',
    'valid',
    { document_version_kind: 'impairment_log' },
    [],
    'Handwritten impairment log scanned and stored.',
    false,
  ),
  // exc_def_9w_corr — proposal sent, customer non-response
  ev(
    EXCEPTION_SLUGS.def9wCorr,
    'proposal_transmission_proof',
    'valid',
    {
      proposal_id: 'prop_2026_009',
      sent_at: dayOffset(-77, '09:00:00').toISOString(),
      recipient: 'bryan@steeplechase.example',
      channel: 'email',
    },
    [],
    'Proposal sent to Steeplechase by email.',
  ),
  ev(
    EXCEPTION_SLUGS.def9wCorr,
    'customer_decision',
    'missing',
    { outcome: 'no_response', decided_at: null },
    [{ field: 'outcome', message: 'No customer decision recorded.' }],
    'Customer non-response since Day -77.',
  ),
  // exc_pump_perf — escalated test discrepancy
  ev(
    EXCEPTION_SLUGS.pumpPerf,
    'restoration_test_record',
    'valid',
    {
      test_type: 'fire_pump_churn',
      readings: { variance_pct: 18, readings_present: true },
      performed_by: 'M. DiSalvo',
      performed_at: dayOffset(-55, '09:00:00').toISOString(),
      outcome: 'variance_flagged',
    },
    [],
    'Annual pump test recorded with 18% variance — escalated.',
  ),
  ev(
    EXCEPTION_SLUGS.pumpPerf,
    'original_source_document',
    'valid',
    { document_version_kind: 'pump_test' },
    [],
    'Pump test document on file.',
    false,
  ),
  // exc_asset_battery — identity mismatch
  ev(
    EXCEPTION_SLUGS.assetBattery,
    'asset_identity_proof',
    'insufficient',
    { manufacturer: 'Power-Sonic (installed)', model: 'PS-12180-NB' },
    [
      {
        field: 'records_alignment',
        message: 'Recorded manufacturer (Eagle-Picher) does not match installed unit (Power-Sonic).',
      },
    ],
    'Photo of installed unit on file; record/install mismatch unresolved.',
  ),
  ev(
    EXCEPTION_SLUGS.assetBattery,
    'photo_evidence',
    'valid',
    { capturedAtClient: dayOffset(-38, '11:00:00').toISOString() },
    [],
    'Photo of battery plate on file.',
    false,
  ),
  // exc_carrier_55a — acknowledged
  ev(
    EXCEPTION_SLUGS.carrier55a,
    'original_source_document',
    'valid',
    { document_version_kind: 'carrier_survey' },
    [],
    'Carrier survey on file.',
    false,
  ),
  ev(
    EXCEPTION_SLUGS.carrier55a,
    'customer_decision',
    'missing',
    { outcome: null, decided_at: null },
    [{ field: 'outcome', message: 'Customer has not yet decided whether to schedule overhaul.' }],
    'Awaiting customer decision on overhaul plan.',
  ),
];

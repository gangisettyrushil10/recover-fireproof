/**
 * Pre-computed Cedar Heights contradictions, linking claim_a_id ↔ claim_b_id.
 *
 * In production these are derived by `@fireproof/legal-export` from the
 * claims; for the seed we hard-code them so the demo can show them on the
 * Contradiction Map even before the worker has run.
 */

import { DEFAULT_ORG_ID } from './organizations.js';
import { EXCEPTION_SLUGS, PROPERTY_SLUGS } from '../ids.js';
import { stableId } from '../util.js';

export interface SeedContradiction {
  slug: string;
  id: string;
  organizationId: string;
  propertyId: string;
  exceptionId: string | null;
  type:
    | 'time_overlap_disagreement'
    | 'identity_attribute_mismatch'
    | 'restoration_test_disagreement'
    | 'notification_proof_missing_or_late'
    | 'fire_watch_gap'
    | 'asset_location_conflict'
    | 'other';
  severity: 'low' | 'medium' | 'medium_high' | 'high' | 'critical';
  confidence: string; // numeric stored as string for Drizzle
  claimASlug: string;
  claimBSlug: string;
  description: string;
}

const propId = stableId(PROPERTY_SLUGS.cedar);

export const CONTRADICTIONS: SeedContradiction[] = [
  {
    slug: 'contra_standpipe_omission',
    id: stableId('contra_standpipe_omission'),
    organizationId: DEFAULT_ORG_ID,
    propertyId: propId,
    exceptionId: stableId(EXCEPTION_SLUGS.def9wCorr),
    type: 'time_overlap_disagreement',
    severity: 'high',
    confidence: '0.95',
    claimASlug: 'claim_doc_quarterly_d211_standpipe_def_false',
    claimBSlug: 'claim_doc_email_thread_corrosion_standpipe_def_true',
    description:
      'Quarterly ITM report (Day -211) marks 9W standpipe satisfactory with no deficiency, while internal email thread (Day -78 to -47) acknowledges visible corrosion. Period overlaps.',
  },
  {
    slug: 'contra_battery_identity',
    id: stableId('contra_battery_identity'),
    organizationId: DEFAULT_ORG_ID,
    propertyId: propId,
    exceptionId: stableId(EXCEPTION_SLUGS.assetBattery),
    type: 'identity_attribute_mismatch',
    severity: 'medium_high',
    confidence: '0.98',
    claimASlug: 'claim_doc_battery_plate_record_battery_recorded_manuf',
    claimBSlug: 'claim_doc_battery_photo_battery_installed_manuf',
    description:
      'Recorded alarm-panel battery is Eagle-Picher Carefree CFM12V18; installed unit is Power-Sonic PS-12180-NB.',
  },
  {
    slug: 'contra_pump_performance',
    id: stableId('contra_pump_performance'),
    organizationId: DEFAULT_ORG_ID,
    propertyId: propId,
    exceptionId: stableId(EXCEPTION_SLUGS.pumpPerf),
    type: 'restoration_test_disagreement',
    severity: 'critical',
    confidence: '0.92',
    claimASlug: 'claim_doc_quarterly_d211_pump_status_sat',
    claimBSlug: 'claim_doc_pump_test_d_pump_perf_pump_variance_18',
    description:
      'Quarterly ITM marked fire pump satisfactory; later pump test shows 18% variance vs prior result.',
  },
  {
    slug: 'contra_ahj_notification_gap',
    id: stableId('contra_ahj_notification_gap'),
    organizationId: DEFAULT_ORG_ID,
    propertyId: propId,
    exceptionId: stableId(EXCEPTION_SLUGS.imp0116),
    type: 'notification_proof_missing_or_late',
    severity: 'critical',
    confidence: '0.97',
    claimASlug: 'claim_doc_impairment_log_d116_imp_duration',
    claimBSlug: 'claim_doc_impairment_log_d116_imp_notification_unknown',
    description:
      'Impairment duration of 350 minutes exceeded the Hartwell >4-hour notification threshold, but the impairment log records AHJ notification status as unknown.',
  },
  {
    slug: 'contra_main_drain_corroboration',
    id: stableId('contra_main_drain_corroboration'),
    organizationId: DEFAULT_ORG_ID,
    propertyId: propId,
    exceptionId: stableId(EXCEPTION_SLUGS.imp0116),
    type: 'restoration_test_disagreement',
    severity: 'high',
    confidence: '0.9',
    claimASlug: 'claim_doc_impairment_log_d116_main_drain_performed',
    claimBSlug: 'claim_doc_impairment_log_d116_main_drain_values_missing',
    description:
      'Main drain test recorded as performed, but no numeric readings (static/residual) captured — "pressure good" only.',
  },
];

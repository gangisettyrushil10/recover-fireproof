/**
 * Pure claim extractors.
 *
 * Each function takes already-loaded structured records and returns a
 * `LegalClaim[]`. NO database calls, NO HTTP, NO file IO. Backends pass in
 * exactly what they have in hand.
 *
 * The lib's contradiction engine consumes the returned `LegalClaim[]`.
 * Backends typically also persist these claims as `document_claims` rows.
 */

import type {
  ExtractorAssetInput,
  ExtractorEvidenceInput,
  ExtractorExceptionInput,
  ExtractorInspectionReportInput,
  ExtractorInternalNoteInput,
  LegalClaim,
} from '../types.js';

/** Stable id helper — deterministic so claims are referentially stable in tests. */
function claimId(parts: ReadonlyArray<string | number | null | undefined>): string {
  return parts.filter((p) => p !== undefined && p !== null && p !== '').join(':');
}

// ─────────────────────────────────────────────────────────────────────────────
// Exception + evidence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the operational claims that an exception + its evidence bag
 * actually assert. Used as the canonical input source for contradictions
 * such as "350-min impairment with no AHJ notification" and "main drain
 * performed but no readings".
 */
export function extractClaimsFromExceptionEvidence(
  exception: ExtractorExceptionInput,
  evidenceItems: ExtractorEvidenceInput[],
): LegalClaim[] {
  const out: LegalClaim[] = [];
  const subject = exception.system_id
    ? { kind: 'system' as const, id: exception.system_id }
    : { kind: 'exception' as const, id: exception.id };

  // 1. system_status — derived from exception state.
  const status: 'satisfactory' | 'unsatisfactory' | 'deficient' | 'unknown' =
    exception.state === 'closed_audit_ready' || exception.state === 'closed_verified'
      ? 'satisfactory'
      : exception.type === 'deficiency' || exception.type === 'impairment'
        ? 'deficient'
        : 'unknown';
  out.push({
    id: claimId(['exc', exception.id, 'system_status']),
    claim_type: 'system_status',
    claim_subject_ref: subject,
    claim_value: { kind: 'system_status', value: status },
    claim_time_range: {
      start: exception.opened_at,
      ...(exception.closed_at ? { end: exception.closed_at } : {}),
    },
    confidence: 1,
    provenance: { extractor: 'extractClaimsFromExceptionEvidence', source: 'exception.state' },
  });

  // 2. duration_minutes — from metadata if present (PRD seed sets reportedDurationMinutes).
  const reportedDuration =
    typeof exception.metadata?.reportedDurationMinutes === 'number'
      ? (exception.metadata.reportedDurationMinutes as number)
      : exception.closed_at
        ? Math.max(
            0,
            Math.round(
              (Date.parse(exception.closed_at) - Date.parse(exception.opened_at)) / 60000,
            ),
          )
        : null;
  if (reportedDuration !== null) {
    out.push({
      id: claimId(['exc', exception.id, 'duration_minutes']),
      claim_type: 'duration_minutes',
      claim_subject_ref: { kind: 'exception', id: exception.id },
      claim_value: { kind: 'duration_minutes', value: reportedDuration },
      claim_time_range: {
        start: exception.opened_at,
        ...(exception.closed_at ? { end: exception.closed_at } : {}),
      },
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromExceptionEvidence', source: 'exception.metadata' },
    });
  }

  // 3. notification_sent — from notification_proof evidence and metadata.notifications.
  const notifMeta =
    (exception.metadata?.notifications as Record<string, string> | undefined) ?? {};
  const ahjNotifFromMeta = notifMeta?.ahj;
  const notifEvidence = evidenceItems.find((e) => e.evidence_type === 'notification_proof');
  let notifValue: 'sent' | 'not_sent' | 'unknown' = 'unknown';
  if (notifEvidence?.status === 'valid') notifValue = 'sent';
  else if (notifEvidence?.status === 'missing' || notifEvidence?.status === 'insufficient')
    notifValue = 'not_sent';
  else if (ahjNotifFromMeta === 'unknown') notifValue = 'unknown';
  else if (ahjNotifFromMeta === 'reported_in_log') notifValue = 'sent';
  else if (ahjNotifFromMeta === 'unspecified') notifValue = 'unknown';
  out.push({
    id: claimId(['exc', exception.id, 'notification_sent']),
    claim_type: 'notification_sent',
    claim_subject_ref: { kind: 'exception', id: exception.id },
    claim_value: { kind: 'notification_sent', value: notifValue },
    claim_time_range: {
      start: exception.opened_at,
      ...(exception.closed_at ? { end: exception.closed_at } : {}),
    },
    confidence: notifEvidence ? 1 : 0.7,
    provenance: {
      extractor: 'extractClaimsFromExceptionEvidence',
      source: notifEvidence ? 'evidence.notification_proof' : 'exception.metadata.notifications',
    },
  });

  // 4. main_drain_performed + main_drain_values
  const restorationEvidence = evidenceItems.find(
    (e) => e.evidence_type === 'restoration_test_record',
  );
  const restorationPayload =
    (restorationEvidence?.payload as
      | { main_drain_performed?: boolean; static_psi?: number; residual_psi?: number }
      | undefined) ?? undefined;
  if (restorationEvidence) {
    const performed = Boolean(restorationPayload?.main_drain_performed);
    out.push({
      id: claimId(['exc', exception.id, 'main_drain_performed']),
      claim_type: 'main_drain_performed',
      claim_subject_ref: subject,
      claim_value: { kind: 'main_drain_performed', value: performed },
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromExceptionEvidence', source: 'evidence.restoration_test_record' },
    });

    const static_psi = restorationPayload?.static_psi;
    const residual_psi = restorationPayload?.residual_psi;
    const readings_present = typeof static_psi === 'number' || typeof residual_psi === 'number';
    out.push({
      id: claimId(['exc', exception.id, 'main_drain_values']),
      claim_type: 'main_drain_values',
      claim_subject_ref: subject,
      claim_value: {
        kind: 'main_drain_values',
        value: {
          ...(typeof static_psi === 'number' ? { static_psi } : {}),
          ...(typeof residual_psi === 'number' ? { residual_psi } : {}),
          readings_present,
        },
      },
      confidence: 1,
      provenance: {
        extractor: 'extractClaimsFromExceptionEvidence',
        source: 'evidence.restoration_test_record',
      },
    });
  }

  // 5. pump_variance_pct — from metadata if a pump-perf exception.
  if (typeof exception.metadata?.pumpVariancePct === 'number') {
    out.push({
      id: claimId(['exc', exception.id, 'pump_variance_pct']),
      claim_type: 'pump_variance_pct',
      claim_subject_ref: subject,
      claim_value: { kind: 'pump_variance_pct', value: exception.metadata.pumpVariancePct as number },
      claim_time_range: { start: exception.opened_at },
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromExceptionEvidence', source: 'exception.metadata.pumpVariancePct' },
    });
  }

  // 6. customer_decision_status — from customer_decision evidence.
  const decisionEvidence = evidenceItems.find((e) => e.evidence_type === 'customer_decision');
  if (decisionEvidence) {
    const status: 'approved' | 'declined' | 'no_response' | 'pending' =
      ((decisionEvidence.payload as Record<string, unknown> | undefined)?.status as
        | 'approved'
        | 'declined'
        | 'no_response'
        | 'pending') ?? 'pending';
    out.push({
      id: claimId(['exc', exception.id, 'customer_decision_status']),
      claim_type: 'customer_decision_status',
      claim_subject_ref: { kind: 'exception', id: exception.id },
      claim_value: { kind: 'customer_decision_status', value: status },
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromExceptionEvidence', source: 'evidence.customer_decision' },
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset
// ─────────────────────────────────────────────────────────────────────────────

export function extractClaimsFromAsset(asset: ExtractorAssetInput): LegalClaim[] {
  const out: LegalClaim[] = [];
  const subject = { kind: 'asset' as const, id: asset.id };
  const sourceVersionId = asset.source_version_id ?? null;

  if (asset.manufacturer) {
    out.push({
      id: claimId(['asset', asset.id, 'manufacturer', sourceVersionId ?? 'installed']),
      claim_type: 'manufacturer',
      claim_subject_ref: subject,
      claim_value: { kind: 'manufacturer', value: asset.manufacturer },
      source_version_id: sourceVersionId,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromAsset' },
    });
  }
  if (asset.model) {
    out.push({
      id: claimId(['asset', asset.id, 'model', sourceVersionId ?? 'installed']),
      claim_type: 'model',
      claim_subject_ref: subject,
      claim_value: { kind: 'model', value: asset.model },
      source_version_id: sourceVersionId,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromAsset' },
    });
  }
  if (asset.serial_number) {
    out.push({
      id: claimId(['asset', asset.id, 'serial', sourceVersionId ?? 'installed']),
      claim_type: 'serial_number',
      claim_subject_ref: subject,
      claim_value: { kind: 'serial_number', value: asset.serial_number },
      source_version_id: sourceVersionId,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromAsset' },
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspection report
// ─────────────────────────────────────────────────────────────────────────────

export function extractClaimsFromInspectionReport(
  report: ExtractorInspectionReportInput,
): LegalClaim[] {
  const out: LegalClaim[] = [];
  for (const finding of report.system_findings) {
    const subject = { kind: 'system' as const, id: finding.system_id };
    out.push({
      id: claimId(['report', report.document_version_id, finding.system_id, 'system_status']),
      claim_type: 'system_status',
      claim_subject_ref: subject,
      claim_value: { kind: 'system_status', value: finding.status },
      claim_time_range: report.period,
      source_version_id: report.document_version_id,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromInspectionReport' },
    });
    out.push({
      id: claimId(['report', report.document_version_id, finding.system_id, 'deficiency_exists']),
      claim_type: 'deficiency_exists',
      claim_subject_ref: subject,
      claim_value: { kind: 'deficiency_exists', value: finding.deficiency_noted },
      claim_time_range: report.period,
      source_version_id: report.document_version_id,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromInspectionReport' },
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal note (e.g. email thread that discusses corrosion)
// ─────────────────────────────────────────────────────────────────────────────

export function extractClaimsFromInternalNote(
  note: ExtractorInternalNoteInput,
): LegalClaim[] {
  return [
    {
      id: claimId(['note', note.document_version_id, 'deficiency_exists']),
      claim_type: 'deficiency_exists',
      claim_subject_ref: note.subject_ref,
      claim_value: { kind: 'deficiency_exists', value: note.deficiency_flagged },
      claim_time_range: note.applies_to ?? { start: note.noted_at },
      source_version_id: note.document_version_id,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromInternalNote', source: 'internal_note' },
    },
  ];
}

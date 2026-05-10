/**
 * Deterministic contradiction detector.
 *
 * Pure function. No LLM, no DB, no IO. Given a flat list of `LegalClaim`s
 * extracted from heterogeneous documents and structured records, returns
 * `DetectedContradiction[]`.
 *
 * Implements the six classes from the PRD:
 *   1. report_vs_internal_note      — official report contradicts internal note
 *   2. omitted_known_deficiency     — internal claim, no overlapping report claim
 *   3. timing_threshold_breach      — duration ≥ 240 minutes + notification not sent
 *   4. missing_corroboration        — main_drain_performed=true with no readings
 *   5. asset_identity_mismatch      — same asset, two different manufacturers/models
 *   6. performance_variance         — prior satisfactory, later pump_variance ≥ 10%
 */

import type {
  DetectedContradiction,
  LegalClaim,
  LegalClaimValue,
  LegalContradictionType,
} from '../types.js';

const NOTIFICATION_DURATION_THRESHOLD_MIN = 240;
const PUMP_VARIANCE_TOLERANCE_PCT = 10;

interface RangeBounds {
  start: number;
  end: number;
}

function timeRangeBounds(c: LegalClaim): RangeBounds | null {
  const r = c.claim_time_range;
  if (!r) return null;
  const start = r.start ? Date.parse(r.start) : Number.NEGATIVE_INFINITY;
  const end = r.end ? Date.parse(r.end) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

function rangesOverlap(a: RangeBounds, b: RangeBounds): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function refKey(c: LegalClaim): string {
  return `${c.claim_subject_ref.kind}:${c.claim_subject_ref.id}`;
}

function subjectMatches(a: LegalClaim, b: LegalClaim): boolean {
  return refKey(a) === refKey(b);
}

function isReportClaim(c: LegalClaim): boolean {
  const src = (c.provenance as Record<string, unknown> | undefined)?.extractor;
  return src === 'extractClaimsFromInspectionReport';
}

function isNoteClaim(c: LegalClaim): boolean {
  const src = (c.provenance as Record<string, unknown> | undefined)?.extractor;
  return src === 'extractClaimsFromInternalNote';
}

function uniqueId(type: LegalContradictionType, a: string, b: string): string {
  // Sort the claim ids so the contradiction id is symmetric.
  const [x, y] = [a, b].sort();
  return `${type}:${x}|${y}`;
}

function valueOf<T extends LegalClaimValue['kind']>(
  c: LegalClaim,
  kind: T,
): Extract<LegalClaimValue, { kind: T }>['value'] | undefined {
  if (c.claim_value.kind !== kind) return undefined;
  return c.claim_value.value as Extract<LegalClaimValue, { kind: T }>['value'];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function detectContradictions(claims: LegalClaim[]): DetectedContradiction[] {
  const seen = new Set<string>();
  const out: DetectedContradiction[] = [];

  // Stable input ordering: by subject, then claim_type, then id.
  const sorted = [...claims].sort((a, b) => {
    const k = refKey(a).localeCompare(refKey(b));
    if (k !== 0) return k;
    const t = a.claim_type.localeCompare(b.claim_type);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });

  pushAll(out, seen, detectReportVsNote(sorted));
  pushAll(out, seen, detectOmittedDeficiency(sorted));
  pushAll(out, seen, detectTimingThresholdBreach(sorted));
  pushAll(out, seen, detectMissingCorroboration(sorted));
  pushAll(out, seen, detectAssetIdentityMismatch(sorted));
  pushAll(out, seen, detectPerformanceVariance(sorted));

  return out;
}

function pushAll(
  out: DetectedContradiction[],
  seen: Set<string>,
  more: DetectedContradiction[],
): void {
  for (const c of more) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Report vs internal note mismatch
// ─────────────────────────────────────────────────────────────────────────────

function detectReportVsNote(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const reportDef = claims.filter(
    (c) => c.claim_type === 'deficiency_exists' && isReportClaim(c),
  );
  const noteDef = claims.filter(
    (c) => c.claim_type === 'deficiency_exists' && isNoteClaim(c),
  );
  for (const r of reportDef) {
    if (valueOf(r, 'deficiency_exists') !== false) continue;
    for (const n of noteDef) {
      if (valueOf(n, 'deficiency_exists') !== true) continue;
      if (!subjectMatches(r, n)) continue;
      const ra = timeRangeBounds(r);
      const nb = timeRangeBounds(n);
      if (ra && nb && !rangesOverlap(ra, nb)) continue;
      out.push({
        id: uniqueId('report_vs_internal_note', r.id, n.id),
        type: 'report_vs_internal_note',
        severity: 'high',
        confidence: 0.9,
        claim_a_id: r.id,
        claim_b_id: n.id,
        explanation:
          'Official report claims no deficiency, but an internal note acknowledges a deficiency in an overlapping period for the same subject.',
        suggested_resolution:
          'Amend the report or attach a supplemental note that reconciles the internal acknowledgement; document the corrective action.',
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Omitted known deficiency
// ─────────────────────────────────────────────────────────────────────────────

function detectOmittedDeficiency(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const internalDef = claims.filter(
    (c) =>
      c.claim_type === 'deficiency_exists' &&
      isNoteClaim(c) &&
      valueOf(c, 'deficiency_exists') === true,
  );
  const reportDef = claims.filter(
    (c) => c.claim_type === 'deficiency_exists' && isReportClaim(c),
  );
  const reportStatus = claims.filter(
    (c) => c.claim_type === 'system_status' && isReportClaim(c),
  );

  for (const note of internalDef) {
    const noteRange = timeRangeBounds(note);
    // Find any report-level deficiency_exists claim that overlaps and acknowledges the deficiency.
    const acknowledged = reportDef.some((r) => {
      if (!subjectMatches(note, r)) return false;
      if (valueOf(r, 'deficiency_exists') !== true) return false;
      const rb = timeRangeBounds(r);
      if (noteRange && rb && !rangesOverlap(noteRange, rb)) return false;
      return true;
    });
    if (acknowledged) continue;

    // Pair with nearest "satisfactory" status claim if one exists; else self-pair.
    const partner = reportStatus.find(
      (r) => subjectMatches(note, r) && valueOf(r, 'system_status') === 'satisfactory',
    );
    out.push({
      id: uniqueId('omitted_known_deficiency', note.id, partner?.id ?? note.id),
      type: 'omitted_known_deficiency',
      severity: 'high',
      confidence: 0.92,
      claim_a_id: partner?.id ?? note.id,
      claim_b_id: note.id,
      explanation: partner
        ? 'Internal note flags a deficiency for the same subject and overlapping period, while the formal report records satisfactory status with no deficiency.'
        : 'Internal note flags a deficiency for the same subject, but no formal report claim covering the same period acknowledges it.',
      suggested_resolution:
        'Issue an amended inspection report or an addendum that records the deficiency, and link the corrective-action plan to the affected subject.',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Timing threshold breach
// ─────────────────────────────────────────────────────────────────────────────

function detectTimingThresholdBreach(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const durations = claims.filter((c) => c.claim_type === 'duration_minutes');
  for (const d of durations) {
    const minutes = valueOf(d, 'duration_minutes');
    if (typeof minutes !== 'number' || minutes < NOTIFICATION_DURATION_THRESHOLD_MIN) continue;
    const notification = claims.find(
      (n) =>
        n.claim_type === 'notification_sent' &&
        n.claim_subject_ref.id === d.claim_subject_ref.id &&
        n.claim_subject_ref.kind === d.claim_subject_ref.kind,
    );
    if (!notification) continue;
    const sent = valueOf(notification, 'notification_sent');
    if (sent === 'sent') continue;
    out.push({
      id: uniqueId('timing_threshold_breach', d.id, notification.id),
      type: 'timing_threshold_breach',
      severity: 'high',
      confidence: 0.95,
      claim_a_id: d.id,
      claim_b_id: notification.id,
      explanation: `Impairment duration ${minutes} minutes meets or exceeds the ${NOTIFICATION_DURATION_THRESHOLD_MIN}-minute threshold, but AHJ notification is recorded as ${sent === 'unknown' ? 'unknown' : 'not sent'}.`,
      suggested_resolution:
        'Capture or upload the AHJ notification proof (email, call note, or service ticket); if no notification was sent, mark the impairment as escalated and execute the catch-up notification protocol.',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Missing corroboration (main drain performed but no readings)
// ─────────────────────────────────────────────────────────────────────────────

function detectMissingCorroboration(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const performed = claims.filter(
    (c) =>
      c.claim_type === 'main_drain_performed' &&
      valueOf(c, 'main_drain_performed') === true,
  );
  for (const p of performed) {
    const values = claims.find(
      (v) => v.claim_type === 'main_drain_values' && subjectMatches(p, v),
    );
    const readings_present =
      values && valueOf(values, 'main_drain_values')?.readings_present === true;
    if (readings_present) continue;
    out.push({
      id: uniqueId('missing_corroboration', p.id, values?.id ?? p.id),
      type: 'missing_corroboration',
      severity: 'medium',
      confidence: 0.9,
      claim_a_id: p.id,
      claim_b_id: values?.id ?? p.id,
      explanation:
        'A main-drain test is recorded as performed, but no numeric readings (static or residual psi) are attached. Free-text notes such as "pressure good" do not satisfy the readings requirement.',
      suggested_resolution:
        'Re-test or upload the gauge photo / signed log with static and residual psi; until readings exist, mark restoration_test_record evidence as insufficient.',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Asset identity mismatch
// ─────────────────────────────────────────────────────────────────────────────

function detectAssetIdentityMismatch(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const identityKinds = ['manufacturer', 'model', 'serial_number'] as const;

  for (const kind of identityKinds) {
    const grouped = new Map<string, LegalClaim[]>();
    for (const c of claims) {
      if (c.claim_type !== kind) continue;
      const key = refKey(c);
      const arr = grouped.get(key) ?? [];
      arr.push(c);
      grouped.set(key, arr);
    }
    for (const [, group] of grouped) {
      if (group.length < 2) continue;
      // Compare every pair within the group; emit at most one per (a,b).
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i]!;
          const b = group[j]!;
          const va =
            kind === 'manufacturer'
              ? valueOf(a, 'manufacturer')
              : kind === 'model'
                ? valueOf(a, 'model')
                : valueOf(a, 'serial_number');
          const vb =
            kind === 'manufacturer'
              ? valueOf(b, 'manufacturer')
              : kind === 'model'
                ? valueOf(b, 'model')
                : valueOf(b, 'serial_number');
          if (!va || !vb) continue;
          if (normalizeIdentity(va) === normalizeIdentity(vb)) continue;
          out.push({
            id: uniqueId('asset_identity_mismatch', a.id, b.id),
            type: 'asset_identity_mismatch',
            severity: kind === 'manufacturer' ? 'high' : 'medium_high',
            confidence: 0.95,
            claim_a_id: a.id,
            claim_b_id: b.id,
            explanation: `Two ${kind} claims for the same asset disagree: "${va}" vs "${vb}".`,
            suggested_resolution:
              'Verify the installed asset against the report (photo of nameplate or serial), then issue an amended report or asset record.',
          });
        }
      }
    }
  }
  return out;
}

function normalizeIdentity(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Performance variance
// ─────────────────────────────────────────────────────────────────────────────

function detectPerformanceVariance(claims: LegalClaim[]): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  const satisfactory = claims.filter(
    (c) =>
      c.claim_type === 'system_status' &&
      isReportClaim(c) &&
      valueOf(c, 'system_status') === 'satisfactory',
  );
  const variances = claims.filter((c) => c.claim_type === 'pump_variance_pct');

  for (const v of variances) {
    const pct = valueOf(v, 'pump_variance_pct');
    if (typeof pct !== 'number' || pct < PUMP_VARIANCE_TOLERANCE_PCT) continue;
    const vTime = timeRangeBounds(v)?.start ?? Number.POSITIVE_INFINITY;
    // Pair with the most recent prior satisfactory claim on the same subject.
    let best: { claim: LegalClaim; t: number } | null = null;
    for (const s of satisfactory) {
      if (!subjectMatches(s, v)) continue;
      const sTime = timeRangeBounds(s)?.end ?? timeRangeBounds(s)?.start;
      if (sTime === undefined) continue;
      if (sTime > vTime) continue;
      if (!best || sTime > best.t) best = { claim: s, t: sTime };
    }
    if (!best) {
      out.push({
        id: uniqueId('performance_variance', v.id, v.id),
        type: 'performance_variance',
        severity: 'high',
        confidence: 0.85,
        claim_a_id: v.id,
        claim_b_id: v.id,
        explanation: `A measured pump variance of ${pct}% meets or exceeds the ${PUMP_VARIANCE_TOLERANCE_PCT}% out-of-tolerance threshold; review the original test for accuracy.`,
        suggested_resolution:
          'Run a witnessed re-test, attach the curve, and update the system status; open a deficiency exception if confirmed.',
      });
      continue;
    }
    out.push({
      id: uniqueId('performance_variance', best.claim.id, v.id),
      type: 'performance_variance',
      severity: 'high',
      confidence: 0.95,
      claim_a_id: best.claim.id,
      claim_b_id: v.id,
      explanation: `Prior report shows satisfactory status, but a later test records pump variance of ${pct}% — at or above the ${PUMP_VARIANCE_TOLERANCE_PCT}% out-of-tolerance threshold.`,
      suggested_resolution:
        'Open a deficiency exception, schedule a witnessed re-test, and notify the carrier if the variance is confirmed.',
    });
  }
  return out;
}

import { describe, expect, it } from 'vitest';
import {
  extractClaimsFromAsset,
  extractClaimsFromExceptionEvidence,
  extractClaimsFromInspectionReport,
  extractClaimsFromInternalNote,
} from '../src/claims/extractor.js';
import { detectContradictions } from '../src/contradictions/engine.js';
import type { LegalClaim } from '../src/types.js';

const D116_OPEN = '2026-01-05T07:40:00-05:00';
const D116_RESTORED = '2026-01-05T13:30:00-05:00';

describe('Cedar Heights contradiction detection', () => {
  it('detects standpipe corrosion omission (report says ok, internal note flags deficiency)', () => {
    const reportClaims = extractClaimsFromInspectionReport({
      document_version_id: 'dv-report-q-211',
      property_id: 'prop_cedar' as never,
      system_findings: [
        { system_id: 'sys_standpipe_9w', status: 'satisfactory', deficiency_noted: false },
      ],
      period: {
        start: '2025-09-15T00:00:00-04:00',
        end: '2025-12-15T00:00:00-05:00',
      },
    });
    const noteClaims = extractClaimsFromInternalNote({
      document_version_id: 'dv-email-78',
      subject_ref: { kind: 'system', id: 'sys_standpipe_9w' },
      deficiency_flagged: true,
      noted_at: '2025-10-30T15:12:00-04:00',
      applies_to: {
        start: '2025-09-15T00:00:00-04:00',
        end: '2025-12-15T00:00:00-05:00',
      },
    });

    const contradictions = detectContradictions([...reportClaims, ...noteClaims]);
    const types = contradictions.map((c) => c.type);
    expect(types).toContain('report_vs_internal_note');
    expect(types).toContain('omitted_known_deficiency');
    const rvn = contradictions.find((c) => c.type === 'report_vs_internal_note');
    expect(rvn?.severity).toBe('high');
  });

  it('detects pump performance variance after a satisfactory report', () => {
    const reportClaims = extractClaimsFromInspectionReport({
      document_version_id: 'dv-report-q-211',
      property_id: 'prop_cedar' as never,
      system_findings: [
        { system_id: 'sys_fire_pump', status: 'satisfactory', deficiency_noted: false },
      ],
      period: {
        start: '2025-09-15T00:00:00-04:00',
        end: '2025-12-15T00:00:00-05:00',
      },
    });
    const pumpExceptionClaims = extractClaimsFromExceptionEvidence(
      {
        id: 'exc_pump_perf' as never,
        type: 'deficiency',
        property_id: 'prop_cedar' as never,
        system_id: 'sys_fire_pump',
        state: 'escalated',
        severity: 'critical',
        opened_at: '2026-01-04T09:00:00-05:00',
        metadata: { pumpVariancePct: 18 },
      },
      [],
    );
    const contradictions = detectContradictions([...reportClaims, ...pumpExceptionClaims]);
    const variance = contradictions.find((c) => c.type === 'performance_variance');
    expect(variance).toBeDefined();
    expect(variance?.severity).toBe('high');
  });

  it('detects battery manufacturer mismatch across asset claim and report claim', () => {
    const installedClaims = extractClaimsFromAsset({
      id: 'asset_battery_a' as never,
      manufacturer: 'Eagle-Picher Carefree CFM12V18',
      source_version_id: null,
    });
    const reportedAsset: LegalClaim = {
      id: 'asset_battery_a:manufacturer:dv-report-q-211',
      claim_type: 'manufacturer',
      claim_subject_ref: { kind: 'asset', id: 'asset_battery_a' },
      claim_value: { kind: 'manufacturer', value: 'Power-Sonic PS-12180' },
      source_version_id: 'dv-report-q-211' as never,
      confidence: 1,
      provenance: { extractor: 'extractClaimsFromInspectionReport' },
    };

    const contradictions = detectContradictions([...installedClaims, reportedAsset]);
    const m = contradictions.find((c) => c.type === 'asset_identity_mismatch');
    expect(m).toBeDefined();
    expect(m?.severity === 'high' || m?.severity === 'medium_high').toBe(true);
  });

  it('detects AHJ notification gap on the 350-minute impairment', () => {
    const claims = extractClaimsFromExceptionEvidence(
      {
        id: 'exc_imp_0116' as never,
        type: 'impairment',
        property_id: 'prop_cedar' as never,
        system_id: 'sys_sprinkler_9',
        state: 'restored_evidence_incomplete',
        severity: 'critical',
        opened_at: D116_OPEN,
        closed_at: D116_RESTORED,
        metadata: {
          reportedDurationMinutes: 350,
          notifications: { ahj: 'unknown' },
        },
      },
      [],
    );

    const contradictions = detectContradictions(claims);
    const breach = contradictions.find((c) => c.type === 'timing_threshold_breach');
    expect(breach).toBeDefined();
    expect(breach?.severity).toBe('high');
    expect(breach?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects missing main drain readings (performed but no values)', () => {
    const claims = extractClaimsFromExceptionEvidence(
      {
        id: 'exc_imp_0116' as never,
        type: 'impairment',
        property_id: 'prop_cedar' as never,
        system_id: 'sys_sprinkler_9',
        state: 'restored_evidence_incomplete',
        severity: 'critical',
        opened_at: D116_OPEN,
        closed_at: D116_RESTORED,
      },
      [
        {
          id: 'ev_main_drain_1' as never,
          organization_id: 'org_beacon' as never,
          exception_id: 'exc_imp_0116' as never,
          evidence_type: 'restoration_test_record',
          status: 'pending',
          required: true,
          blocking: true,
          rule_key: null,
          document_version_ids: [],
          waived_by_user_id: null,
          waived_at: null,
          waiver_reason: null,
          notes: 'Tech wrote "pressure good"',
          metadata: {},
          created_at: '2026-01-05T13:30:00-05:00',
          updated_at: '2026-01-05T13:30:00-05:00',
          payload: { main_drain_performed: true },
        },
      ],
    );
    const contradictions = detectContradictions(claims);
    const corrob = contradictions.find((c) => c.type === 'missing_corroboration');
    expect(corrob).toBeDefined();
    expect(corrob?.severity).toBe('medium');
  });
});

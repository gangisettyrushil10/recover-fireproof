import { describe, expect, it } from 'vitest';
import { evaluateRules } from '../src/evaluator.js';
import { hartwell_v1, wessex_v1, dunmoor_v1 } from '../src/packs/index.js';
import {
  cedarHeightsImpairmentContext,
  CEDAR_HEIGHTS_OPENED,
} from './fixtures.js';

describe('evaluator — Hartwell impairment >4h on sprinkler', () => {
  it('emits AHJ + fire watch + restoration test blockers', () => {
    const ctx = cedarHeightsImpairmentContext();
    const result = evaluateRules(hartwell_v1, ctx);

    expect(result.rulePackId).toBe('hartwell_v1');
    expect(result.blocking).toEqual(
      expect.arrayContaining([
        'ahj_notification.valid',
        'fire_watch_record.valid',
        'restoration_test_record.valid',
        'original_source_document.valid',
      ]),
    );

    const evidenceTypes = result.requirements.map((r) => r.evidence_type);
    expect(evidenceTypes).toEqual(
      expect.arrayContaining([
        'notification_proof',
        'fire_watch_record',
        'restoration_test_record',
        'original_source_document',
      ]),
    );

    const notif = result.requirements.find(
      (r) => r.evidence_type === 'notification_proof',
    );
    expect(notif).toBeDefined();
    // Targets union: AHJ (from gt4h rule) + customer (from any rule)
    expect(notif!.notification_targets).toEqual(
      expect.arrayContaining(['AHJ', 'customer']),
    );

    expect(result.confidenceSummary).toEqual({
      high: 1,
      medium: 0,
      low_inferred: 0,
    });
    expect(result.unspecified).toEqual([]);
  });

  it('does NOT block closure for the same impairment in Wessex', () => {
    const ctx = cedarHeightsImpairmentContext({
      property: { jurisdictionId: 'jur_wessex' },
    });
    const result = evaluateRules(wessex_v1, ctx);

    // No blocking entries because the wessex impairment rule is unspecified.
    expect(result.blocking).toEqual([]);
    expect(result.unspecified.map((u) => u.ruleId)).toContain(
      'wessex.impairment.any.v1',
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unspecified_rule:wessex.impairment.any.v1'),
      ]),
    );
    expect(result.confidenceSummary).toEqual({
      high: 0,
      medium: 1,
      low_inferred: 0,
    });
  });
});

describe('evaluator — Dunmoor (low_inferred, disabled pack)', () => {
  it('emits warnings + unspecified entries and never blocks', () => {
    const ctx = cedarHeightsImpairmentContext({
      property: { jurisdictionId: 'jur_dunmoor' },
    });
    const result = evaluateRules(dunmoor_v1, ctx);

    expect(result.blocking).toEqual([]);
    expect(result.warnings).toContain('rule_pack_disabled');
    expect(result.unspecified.length).toBeGreaterThan(0);
    expect(result.unspecified[0]!.ruleId).toBe('dunmoor.impairment.any.v1');
    expect(result.confidenceSummary).toEqual({
      high: 0,
      medium: 0,
      low_inferred: 1,
    });
  });
});

describe('evaluator — no matched rules', () => {
  it('warns when no rules match the context', () => {
    // Asset-identity exception against Wessex which has no asset_identity rule.
    const ctx = cedarHeightsImpairmentContext({
      exception: {
        id: 'exc_other',
        type: 'asset_identity',
        state: 'verification_pending',
        severity: 'medium',
        openedAt: CEDAR_HEIGHTS_OPENED,
      },
      property: { jurisdictionId: 'jur_wessex' },
    });
    const result = evaluateRules(wessex_v1, ctx);
    expect(result.blocking).toEqual([]);
    expect(result.requirements).toEqual([]);
    expect(result.warnings).toContain('no_active_rules_for_context');
  });
});

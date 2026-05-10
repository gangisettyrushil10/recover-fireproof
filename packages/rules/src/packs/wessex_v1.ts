/**
 * Wessex rule pack v1 — medium confidence.
 *
 * Source: PRD §"Mocked jurisdiction seeds" (Wessex row). Most rules remain
 * `unspecified` because the local AHJ-notification rule has not been
 * verified — closure is therefore NOT auto-blocked, but the evaluator
 * surfaces the rule id + reason as an `unspecified` warning.
 */

import { defineRulePack, SOURCE_NOTE } from './_validate.js';

export const wessex_v1 = defineRulePack({
  id: 'wessex_v1',
  jurisdictionId: 'jur_wessex',
  version: 'v1',
  effectiveFrom: '2025-01-01',
  status: 'active',
  confidence: 'medium',
  sourceNote: SOURCE_NOTE,
  rules: [
    // Impairment rule placeholder — local AHJ-notification thresholds unknown.
    {
      id: 'wessex.impairment.any.v1',
      jurisdictionId: 'jur_wessex',
      exceptionType: 'impairment',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'impairment' },
        { kind: 'always' },
      ],
      requires: [],
      blocksClosureUntil: [],
      sourceNote:
        SOURCE_NOTE +
        ' Local AHJ-notification threshold not yet known for Wessex.',
      status: 'unspecified',
    },

    // Annual main-drain documentation expectation, gated on severity.
    {
      id: 'wessex.maindrain.annual.v1',
      jurisdictionId: 'jur_wessex',
      exceptionType: 'deficiency',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'deficiency' },
        { kind: 'system_class_eq', value: 'sprinkler' },
        { kind: 'severity_gte', severity: 'medium' },
      ],
      requires: [
        {
          evidence_type: 'restoration_test_record',
          cardinality: 'one',
          required: true,
        },
        {
          evidence_type: 'original_source_document',
          cardinality: 'one',
          required: false,
        },
      ],
      blocksClosureUntil: ['restoration_test_record.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },
  ],
});

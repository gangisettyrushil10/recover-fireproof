/**
 * Dunmoor rule pack v1 — low / inferred confidence.
 *
 * Source: PRD §"Mocked jurisdiction seeds" (Dunmoor row). NFPA 25 (2020)
 * baseline is INFERRED only; all local amendments are unspecified and the
 * pack itself is `disabled` so the evaluator never auto-blocks closure
 * for a Dunmoor exception. It still surfaces unspecified warnings so
 * compliance can see the inferred coverage.
 */

import { defineRulePack, SOURCE_NOTE } from './_validate.js';

const DUNMOOR_NOTE =
  SOURCE_NOTE + ' Inferred from NFPA 25 (2020) baseline; not yet verified for Dunmoor.';

export const dunmoor_v1 = defineRulePack({
  id: 'dunmoor_v1',
  jurisdictionId: 'jur_dunmoor',
  version: 'v1',
  effectiveFrom: '2025-01-01',
  status: 'disabled',
  confidence: 'low_inferred',
  sourceNote: DUNMOOR_NOTE,
  rules: [
    {
      id: 'dunmoor.impairment.any.v1',
      jurisdictionId: 'jur_dunmoor',
      exceptionType: 'impairment',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'impairment' },
        { kind: 'always' },
      ],
      requires: [
        {
          evidence_type: 'notification_proof',
          cardinality: 'one',
          required: false,
          notification_targets: ['AHJ'],
        },
        {
          evidence_type: 'fire_watch_record',
          cardinality: 'one',
          required: false,
        },
      ],
      blocksClosureUntil: [],
      sourceNote: DUNMOOR_NOTE,
      status: 'unspecified',
    },
    {
      id: 'dunmoor.deficiency.any.v1',
      jurisdictionId: 'jur_dunmoor',
      exceptionType: 'deficiency',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'deficiency' },
        { kind: 'always' },
      ],
      requires: [
        {
          evidence_type: 'proposal_transmission_proof',
          cardinality: 'one',
          required: false,
        },
        {
          evidence_type: 'customer_decision',
          cardinality: 'one',
          required: false,
        },
      ],
      blocksClosureUntil: [],
      sourceNote: DUNMOOR_NOTE,
      status: 'unspecified',
    },
    {
      id: 'dunmoor.carrier_recommendation.any.v1',
      jurisdictionId: 'jur_dunmoor',
      exceptionType: 'carrier_recommendation',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'carrier_recommendation' },
        { kind: 'always' },
      ],
      requires: [],
      blocksClosureUntil: [],
      sourceNote: DUNMOOR_NOTE,
      status: 'unspecified',
    },
    {
      id: 'dunmoor.asset_identity.any.v1',
      jurisdictionId: 'jur_dunmoor',
      exceptionType: 'asset_identity',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'asset_identity' },
        { kind: 'always' },
      ],
      requires: [],
      blocksClosureUntil: [],
      sourceNote: DUNMOOR_NOTE,
      status: 'unspecified',
    },
  ],
});

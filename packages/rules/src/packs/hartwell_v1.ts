/**
 * Hartwell rule pack v1 — high confidence.
 *
 * Source: PRD §"Mocked jurisdiction seeds" (Hartwell row) plus the example
 * rule object in §"Jurisdiction and rule-engine design".
 *
 * NOTE: All rules carry the standard mocked-source note — these were
 * derived from the Beacon packet seed and must be re-verified by the
 * compliance owner before production use.
 */

import { defineRulePack, SOURCE_NOTE } from './_validate.js';

export const hartwell_v1 = defineRulePack({
  id: 'hartwell_v1',
  jurisdictionId: 'jur_hartwell',
  version: 'v1',
  effectiveFrom: '2025-01-01',
  status: 'active',
  confidence: 'high',
  sourceNote: SOURCE_NOTE,
  rules: [
    // Impairment >4h on water-based systems → AHJ + fire watch + restoration test
    {
      id: 'hartwell.impairment.gt4h.v1',
      jurisdictionId: 'jur_hartwell',
      exceptionType: 'impairment',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'impairment' },
        { kind: 'duration_minutes_gte', minutes: 240 },
        {
          kind: 'system_class_in',
          values: ['sprinkler', 'standpipe', 'fire_pump', 'water_supply'],
        },
      ],
      requires: [
        {
          evidence_type: 'notification_proof',
          cardinality: 'one',
          required: true,
          notification_targets: ['AHJ'],
        },
        {
          evidence_type: 'fire_watch_record',
          cardinality: 'one',
          required: true,
        },
        {
          evidence_type: 'restoration_test_record',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: [
        'ahj_notification.valid',
        'fire_watch_record.valid',
        'restoration_test_record.valid',
      ],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },

    // Any impairment in Hartwell → customer notification proof + original source doc
    {
      id: 'hartwell.impairment.any.v1',
      jurisdictionId: 'jur_hartwell',
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
          required: true,
          notification_targets: ['customer'],
        },
        {
          evidence_type: 'original_source_document',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: ['original_source_document.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },

    // Sprinkler-impairment restoration test gating (subtype enforced by API)
    {
      id: 'hartwell.impairment.sprinkler.maindrain.v1',
      jurisdictionId: 'jur_hartwell',
      exceptionType: 'impairment',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'impairment' },
        { kind: 'system_class_eq', value: 'sprinkler' },
      ],
      requires: [
        {
          evidence_type: 'restoration_test_record',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: ['restoration_test_record.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },

    // Critical-or-higher deficiency → proposal sent + customer decision recorded
    {
      id: 'hartwell.deficiency.critical.v1',
      jurisdictionId: 'jur_hartwell',
      exceptionType: 'deficiency',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'deficiency' },
        { kind: 'severity_gte', severity: 'high' },
      ],
      requires: [
        {
          evidence_type: 'proposal_transmission_proof',
          cardinality: 'one',
          required: true,
        },
        {
          evidence_type: 'customer_decision',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: ['customer_decision.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },

    // Carrier recommendations require the originating doc + a customer decision
    {
      id: 'hartwell.carrier_recommendation.any.v1',
      jurisdictionId: 'jur_hartwell',
      exceptionType: 'carrier_recommendation',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'carrier_recommendation' },
        { kind: 'always' },
      ],
      requires: [
        {
          evidence_type: 'original_source_document',
          cardinality: 'one',
          required: true,
        },
        {
          evidence_type: 'customer_decision',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: ['customer_decision.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },

    // Asset-identity exceptions need structured identity proof + a photo
    {
      id: 'hartwell.asset_identity.any.v1',
      jurisdictionId: 'jur_hartwell',
      exceptionType: 'asset_identity',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [
        { kind: 'exception_type_eq', type: 'asset_identity' },
        { kind: 'always' },
      ],
      requires: [
        {
          evidence_type: 'asset_identity_proof',
          cardinality: 'one',
          required: true,
        },
        {
          evidence_type: 'photo_evidence',
          cardinality: 'one',
          required: true,
        },
      ],
      blocksClosureUntil: ['asset_identity_proof.valid'],
      sourceNote: SOURCE_NOTE,
      status: 'active',
    },
  ],
});

import { describe, expect, it } from 'vitest';
import { RulePackSchema, RuleSchema } from '../src/types.js';
import { hartwell_v1, packForJurisdiction } from '../src/packs/index.js';

describe('Zod validation of rule packs', () => {
  it('seeded hartwell pack parses successfully', () => {
    expect(() => RulePackSchema.parse(hartwell_v1)).not.toThrow();
  });

  it('rejects an obviously invalid rule (missing required fields)', () => {
    const bad = {
      // missing id, jurisdictionId, exceptionType, version, etc.
      effectiveFrom: '2025-01-01',
      when: [],
      requires: [],
      blocksClosureUntil: [],
      sourceNote: 'x',
      status: 'active',
    };
    const result = RuleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid blocksClosureUntil key shape', () => {
    const bad = {
      id: 'x',
      jurisdictionId: 'j',
      exceptionType: 'impairment',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [{ kind: 'always' }],
      requires: [],
      blocksClosureUntil: ['NOT-A-VALID-KEY'], // uppercase + dashes
      sourceNote: 'x',
      status: 'active',
    };
    const result = RuleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid exception type enum value', () => {
    const bad = {
      id: 'x',
      jurisdictionId: 'j',
      exceptionType: 'not_a_real_type',
      version: 'v1',
      effectiveFrom: '2025-01-01',
      when: [{ kind: 'always' }],
      requires: [],
      blocksClosureUntil: [],
      sourceNote: 'x',
      status: 'active',
    };
    const result = RuleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe('packs registry', () => {
  it('packForJurisdiction returns the matching pack', () => {
    expect(packForJurisdiction('jur_hartwell')?.id).toBe('hartwell_v1');
    expect(packForJurisdiction('jur_wessex')?.id).toBe('wessex_v1');
    expect(packForJurisdiction('jur_dunmoor')?.id).toBe('dunmoor_v1');
    expect(packForJurisdiction('jur_unknown')).toBeUndefined();
  });

  it('packForJurisdiction respects the version filter', () => {
    expect(packForJurisdiction('jur_hartwell', 'v1')?.id).toBe('hartwell_v1');
    expect(packForJurisdiction('jur_hartwell', 'v999')).toBeUndefined();
  });
});

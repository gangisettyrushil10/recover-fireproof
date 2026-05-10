import { describe, expect, it } from 'vitest';
import { anyHoldActive, isWriteAllowed, summarizeHolds } from '../src/holds/policy.js';
import type { LegalHold } from '@fireproof/domain/types';
import type { HoldScope } from '../src/types.js';

const propertyHold: LegalHold = {
  id: 'hold-1' as never,
  organization_id: 'org-1' as never,
  name: 'Cedar Heights post-incident hold',
  reason: 'Litigation hold issued by counsel',
  status: 'active',
  subjects: [{ kind: 'property', id: 'prop_cedar' }],
  issued_by_user_id: null,
  issued_at: '2026-01-08T09:00:00-05:00',
  released_by_user_id: null,
  released_at: null,
  release_reason: null,
  metadata: {},
  created_at: '2026-01-08T09:00:00-05:00',
  updated_at: '2026-01-08T09:00:00-05:00',
};

describe('legal hold policy', () => {
  it('rejects delete under an active hold covering the scope', () => {
    const scope: HoldScope = { kind: 'property', id: 'prop_cedar' as never };
    expect(isWriteAllowed(scope, [propertyHold], 'delete')).toBe(false);
    expect(isWriteAllowed(scope, [propertyHold], 'overwrite_original')).toBe(false);
  });

  it('always allows append_derivative even under hold', () => {
    const scope: HoldScope = { kind: 'property', id: 'prop_cedar' as never };
    expect(isWriteAllowed(scope, [propertyHold], 'append_derivative')).toBe(true);
  });

  it('allows delete when no hold covers the scope', () => {
    const otherProperty: HoldScope = { kind: 'property', id: 'prop_other' as never };
    expect(isWriteAllowed(otherProperty, [propertyHold], 'delete')).toBe(true);
  });

  it('treats released holds as inactive', () => {
    const released = { ...propertyHold, status: 'released' as const };
    const scope: HoldScope = { kind: 'property', id: 'prop_cedar' as never };
    expect(isWriteAllowed(scope, [released], 'delete')).toBe(true);
    expect(anyHoldActive([released])).toBe(false);
  });

  it('summarizes active holds for the counsel packet', () => {
    const summary = summarizeHolds([propertyHold]);
    expect(summary.total_active).toBe(1);
    expect(summary.total_subjects).toBe(1);
    expect(summary.active_holds[0]?.name).toBe('Cedar Heights post-incident hold');
  });
});

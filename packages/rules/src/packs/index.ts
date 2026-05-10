/**
 * `@fireproof/rules/packs` — registry of seeded rule packs.
 *
 * Packs are addressable by their id. `packForJurisdiction` returns the
 * pack matching a given `jurisdictionId` (and optionally a specific
 * version label). Returns `undefined` when no pack is registered.
 */

import type { RulePack } from '../types.js';
import { hartwell_v1 } from './hartwell_v1.js';
import { wessex_v1 } from './wessex_v1.js';
import { dunmoor_v1 } from './dunmoor_v1.js';

export { hartwell_v1, wessex_v1, dunmoor_v1 };

export const ALL_PACKS: Record<string, RulePack> = {
  hartwell_v1,
  wessex_v1,
  dunmoor_v1,
};

export function packForJurisdiction(
  jurisdictionId: string,
  version?: string,
): RulePack | undefined {
  const matches = Object.values(ALL_PACKS).filter(
    (p) => p.jurisdictionId === jurisdictionId,
  );
  if (matches.length === 0) return undefined;
  if (version === undefined) {
    // Default: most recent `effectiveFrom` wins; ties broken by version label.
    return matches.sort((a, b) => {
      const fromCmp = b.effectiveFrom.localeCompare(a.effectiveFrom);
      return fromCmp !== 0 ? fromCmp : b.version.localeCompare(a.version);
    })[0];
  }
  return matches.find((p) => p.version === version);
}

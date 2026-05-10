/**
 * Internal helper: validate a `RulePack` literal against the Zod schema and
 * throw with a helpful message at module load time. Each pack file calls
 * this so bad seeds are caught when the pack is imported.
 */

import { RulePackSchema, type RulePack } from '../types.js';

export function defineRulePack(pack: RulePack): RulePack {
  const parsed = RulePackSchema.safeParse(pack);
  if (!parsed.success) {
    throw new Error(
      `Invalid rule pack "${pack.id}": ${JSON.stringify(parsed.error.issues, null, 2)}`,
    );
  }
  return parsed.data;
}

export const SOURCE_NOTE = 'Mocked from Beacon packet — re-verify before production.';

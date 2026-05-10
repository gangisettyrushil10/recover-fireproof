/**
 * Jurisdictions referenced by the rule engine. Hartwell is the canonical
 * jurisdiction for Cedar Heights; Wessex/Dunmoor are seeded so the rule
 * pack picker has more than one entry.
 */

import { JURISDICTION_SLUGS, RULE_PACK_SLUGS } from '../ids.js';
import { stableId } from '../util.js';

export interface SeedJurisdiction {
  slug: string;
  id: string;
  name: string;
  ahjName: string;
  stateCode: string;
  city: string | null;
  county: string | null;
  defaultRulePackSlug: string;
  defaultRulePackId: string;
  confidence: 'high' | 'medium' | 'low_inferred';
  metadata: Record<string, unknown>;
}

export const JURISDICTIONS: SeedJurisdiction[] = [
  {
    slug: JURISDICTION_SLUGS.hartwell,
    id: stableId(JURISDICTION_SLUGS.hartwell),
    name: 'Hartwell',
    ahjName: 'City of Hartwell Fire Marshal',
    stateCode: 'MA',
    city: 'Hartwell',
    county: null,
    defaultRulePackSlug: RULE_PACK_SLUGS.hartwellV1,
    defaultRulePackId: stableId(RULE_PACK_SLUGS.hartwellV1),
    confidence: 'high',
    metadata: { source: 'PRD §Mocked jurisdiction seeds' },
  },
  {
    slug: JURISDICTION_SLUGS.wessex,
    id: stableId(JURISDICTION_SLUGS.wessex),
    name: 'Wessex',
    ahjName: 'Wessex Fire Marshal',
    stateCode: 'unspecified',
    city: 'Wessex',
    county: null,
    defaultRulePackSlug: RULE_PACK_SLUGS.wessexV1,
    defaultRulePackId: stableId(RULE_PACK_SLUGS.wessexV1),
    confidence: 'medium',
    metadata: { source: 'PRD §Mocked jurisdiction seeds' },
  },
  {
    slug: JURISDICTION_SLUGS.dunmoor,
    id: stableId(JURISDICTION_SLUGS.dunmoor),
    name: 'Dunmoor',
    ahjName: 'Dunmoor Fire Marshal',
    stateCode: 'unspecified',
    city: 'Dunmoor',
    county: null,
    defaultRulePackSlug: RULE_PACK_SLUGS.dunmoorV1,
    defaultRulePackId: stableId(RULE_PACK_SLUGS.dunmoorV1),
    confidence: 'low_inferred',
    metadata: { source: 'PRD §Mocked jurisdiction seeds' },
  },
];

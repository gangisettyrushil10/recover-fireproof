/**
 * Rule bindings — link Cedar Heights to Hartwell's hartwell_v1 pack across
 * all four exception types so the rule evaluator picks them up.
 */

import {
  JURISDICTION_SLUGS,
  PROPERTY_SLUGS,
  RULE_BINDING_SLUGS,
  RULE_PACK_SLUGS,
} from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { stableId } from '../util.js';

export interface SeedRuleBinding {
  slug: string;
  id: string;
  organizationId: string;
  rulePackId: string;
  scope: 'organization' | 'jurisdiction' | 'property';
  jurisdictionId: string | null;
  propertyId: string | null;
  exceptionType: 'impairment' | 'deficiency' | 'carrier_recommendation' | 'asset_identity';
  priority: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

const EXCEPTION_TYPES: SeedRuleBinding['exceptionType'][] = [
  'impairment',
  'deficiency',
  'carrier_recommendation',
  'asset_identity',
];

export const RULE_BINDINGS: SeedRuleBinding[] = EXCEPTION_TYPES.map((etype) => ({
  slug: `${RULE_BINDING_SLUGS.cedarHartwell}_${etype}`,
  id: stableId(`${RULE_BINDING_SLUGS.cedarHartwell}_${etype}`),
  organizationId: DEFAULT_ORG_ID,
  rulePackId: stableId(RULE_PACK_SLUGS.hartwellV1),
  scope: 'property',
  jurisdictionId: stableId(JURISDICTION_SLUGS.hartwell),
  propertyId: stableId(PROPERTY_SLUGS.cedar),
  exceptionType: etype,
  priority: 100,
  isActive: true,
  metadata: { source: 'cedar_heights_seed' },
}));

/**
 * Cedar Heights — the canonical demo property.
 */

import { JURISDICTION_SLUGS, ORG_SLUGS, PROPERTY_SLUGS } from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { stableId } from '../util.js';

export interface SeedProperty {
  slug: string;
  id: string;
  organizationId: string;
  ownerOrgId: string;
  managerOrgId: string;
  jurisdictionId: string;
  name: string;
  addressJson: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export const PROPERTIES: SeedProperty[] = [
  {
    slug: PROPERTY_SLUGS.cedar,
    id: stableId(PROPERTY_SLUGS.cedar),
    organizationId: DEFAULT_ORG_ID,
    ownerOrgId: stableId(ORG_SLUGS.halberd),
    managerOrgId: stableId(ORG_SLUGS.steeplechase),
    jurisdictionId: stableId(JURISDICTION_SLUGS.hartwell),
    name: 'Cedar Heights Apartments',
    addressJson: {
      street: '1414 Cedar Avenue',
      city: 'Hartwell',
      state: 'MA',
      country: 'US',
    },
    metadata: {
      stories: 12,
      units: 142,
      occupancyClass: 'multifamily_residential',
    },
  },
];

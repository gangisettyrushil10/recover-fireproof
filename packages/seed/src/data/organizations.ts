/**
 * Cedar Heights organizations — the six PRD-canonical orgs plus a stable
 * "platform" org-id we use as `organization_id` for cross-tenant rows
 * (jurisdictions, rule packs).
 *
 * NOTE on `kind`: the PRD calls Steeplechase a `property_manager`, but the
 * DB enum value is `manager` (see `packages/db/src/schema/_enums.ts`). The
 * full PRD label is preserved in `metadata.role`.
 */

import { ORG_SLUGS } from '../ids.js';
import { stableId } from '../util.js';

export interface SeedOrganization {
  slug: string;
  id: string;
  kind: 'contractor' | 'owner' | 'manager' | 'ahj' | 'insurer' | 'counsel' | 'platform';
  name: string;
  status: string;
  timezone: string;
  metadata: Record<string, unknown>;
}

export const ORGANIZATIONS: SeedOrganization[] = [
  {
    slug: ORG_SLUGS.beacon,
    id: stableId(ORG_SLUGS.beacon),
    kind: 'contractor',
    name: 'Beacon Fire & Safety',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'contractor' },
  },
  {
    slug: ORG_SLUGS.halberd,
    id: stableId(ORG_SLUGS.halberd),
    kind: 'owner',
    name: 'Halberd Realty Holdings',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'owner' },
  },
  {
    slug: ORG_SLUGS.steeplechase,
    id: stableId(ORG_SLUGS.steeplechase),
    kind: 'manager',
    name: 'Steeplechase Property Management',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'property_manager' },
  },
  {
    slug: ORG_SLUGS.hartwellAhj,
    id: stableId(ORG_SLUGS.hartwellAhj),
    kind: 'ahj',
    name: 'City of Hartwell Fire Marshal',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'ahj' },
  },
  {
    slug: ORG_SLUGS.continental,
    id: stableId(ORG_SLUGS.continental),
    kind: 'insurer',
    name: 'Continental Mutual Property',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'insurer' },
  },
  {
    slug: ORG_SLUGS.worthPatel,
    id: stableId(ORG_SLUGS.worthPatel),
    kind: 'counsel',
    name: 'Worth, Patel & Associates',
    status: 'active',
    timezone: 'America/New_York',
    metadata: { role: 'counsel' },
  },
];

/**
 * Default `organization_id` for shared-tenant business rows. Beacon (the
 * contractor) is the operational owner of the Cedar Heights records; cross
 * tenant rows like jurisdictions/rule packs are also stored under Beacon for
 * the demo so a single tenant view shows the full picture.
 */
export const DEFAULT_ORG_ID = stableId(ORG_SLUGS.beacon);

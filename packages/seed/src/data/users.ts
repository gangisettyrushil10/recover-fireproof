/**
 * Dev-login picker users. Each user is bound to one org, with a UserRole that
 * matches the DB enum (`admin | manager | inspector | office | viewer | integration`).
 *
 * The richer human label (e.g. "Office Manager", "Lead Field Tech") is kept in
 * `metadata.title` so the dev-login UI can render it without inventing fields.
 */

import { ORG_SLUGS, USER_SLUGS } from '../ids.js';
import { stableId } from '../util.js';

export interface SeedUser {
  slug: string;
  id: string;
  organizationSlug: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'inspector' | 'office' | 'viewer' | 'integration';
  metadata: Record<string, unknown>;
}

const u = (
  slug: string,
  organizationSlug: string,
  email: string,
  fullName: string,
  role: SeedUser['role'],
  title: string,
): SeedUser => ({
  slug,
  id: stableId(slug),
  organizationSlug,
  organizationId: stableId(organizationSlug),
  email,
  fullName,
  role,
  metadata: { title },
});

export const USERS: SeedUser[] = [
  u(USER_SLUGS.lpark, ORG_SLUGS.beacon, 'lpark@beacon.example', 'L. Park', 'office', 'Office Manager'),
  u(USER_SLUGS.mdisalvo, ORG_SLUGS.beacon, 'mdisalvo@beacon.example', 'M. DiSalvo', 'inspector', 'Lead Field Tech'),
  u(USER_SLUGS.bryanPm, ORG_SLUGS.steeplechase, 'bryan@steeplechase.example', 'Bryan (Property Manager)', 'manager', 'Property Manager'),
  u(USER_SLUGS.reyes, ORG_SLUGS.hartwellAhj, 'reyes@hartwell.gov.example', 'Marshal Reyes', 'viewer', 'AHJ Reviewer'),
  u(USER_SLUGS.jstein, ORG_SLUGS.continental, 'jstein@continental.example', 'J. Stein', 'viewer', 'Insurer Loss Control'),
  u(USER_SLUGS.counsel, ORG_SLUGS.worthPatel, 'counsel@worthpatel.example', 'Worth, Patel Counsel', 'manager', 'Counsel'),
];

export const DEFAULT_ACTOR_USER_ID = stableId(USER_SLUGS.lpark);

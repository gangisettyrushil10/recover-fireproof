/**
 * Five Cedar Heights systems referenced by exceptions, evidence, and claims.
 *
 * `kind` matches `SystemKindValues` from `@fireproof/domain`. `system_class`
 * matches the engine-level `SystemClassValues` from `@fireproof/rules`.
 */

import { PROPERTY_SLUGS, SYSTEM_SLUGS } from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { stableId } from '../util.js';

export interface SeedSystem {
  slug: string;
  id: string;
  organizationId: string;
  propertyId: string;
  /** Domain `SystemKind` — narrow taxonomy the DB stores. */
  kind: string;
  /** Engine-level `SystemClass` — broader, used by rule conditions. */
  systemClass: string;
  label: string;
  name: string;
  location: string;
  standardRef: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
}

export const SYSTEMS: SeedSystem[] = [
  {
    slug: SYSTEM_SLUGS.sprinkler9,
    id: stableId(SYSTEM_SLUGS.sprinkler9),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    kind: 'sprinkler_wet',
    systemClass: 'sprinkler',
    label: '9th-floor wet sprinkler zone',
    name: '9th-floor wet sprinkler zone',
    location: '9th floor',
    standardRef: 'NFPA 25 (2017)',
    description: null,
    metadata: { floor: 9 },
  },
  {
    slug: SYSTEM_SLUGS.standpipe9w,
    id: stableId(SYSTEM_SLUGS.standpipe9w),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    kind: 'standpipe',
    systemClass: 'standpipe',
    label: '9th-floor west stairwell hose connection',
    name: '9th-floor west stairwell hose connection',
    location: '9th floor west stairwell',
    standardRef: 'NFPA 25 (2017)',
    description: null,
    metadata: { floor: 9, stairwell: 'west' },
  },
  {
    slug: SYSTEM_SLUGS.firePump,
    id: stableId(SYSTEM_SLUGS.firePump),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    kind: 'fire_pump',
    systemClass: 'fire_pump',
    label: 'Main electric horizontal split-case fire pump',
    name: 'Main electric horizontal split-case fire pump',
    location: 'Pump room (basement)',
    standardRef: 'NFPA 25 (2017)',
    description: null,
    metadata: { drive: 'electric', configuration: 'horizontal_split_case' },
  },
  {
    slug: SYSTEM_SLUGS.alarmPanel,
    id: stableId(SYSTEM_SLUGS.alarmPanel),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    kind: 'fire_alarm',
    systemClass: 'fire_alarm',
    label: 'Simplex 4100ES panel',
    name: 'Simplex 4100ES panel',
    location: 'Fire command center',
    standardRef: 'NFPA 72',
    description: null,
    metadata: { panelMake: 'Simplex', panelModel: '4100ES' },
  },
  {
    slug: SYSTEM_SLUGS.fdc,
    id: stableId(SYSTEM_SLUGS.fdc),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    kind: 'other',
    systemClass: 'water_supply',
    label: 'Front Cedar Avenue FDC',
    name: 'Front Cedar Avenue FDC',
    location: 'Cedar Avenue front exterior',
    standardRef: 'NFPA 25 (2017)',
    description: null,
    metadata: { side: 'front' },
  },
];

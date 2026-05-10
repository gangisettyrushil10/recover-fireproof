/**
 * Three assets that drive the Cedar Heights demo:
 * - `ast_battery_recorded`: what the last formal report claims is installed
 *   (Eagle-Picher CFM12V18). Serial unspecified.
 * - `ast_battery_installed`: what's actually on the panel today
 *   (Power-Sonic PS-12180-NB, installed 2025-08-12). The mismatch with
 *   `ast_battery_recorded` produces the asset-identity contradiction.
 * - `ast_pump_motor`: aging Aurora pump motor referenced by the carrier
 *   recommendation and the pump-performance discrepancy.
 */

import { ASSET_SLUGS, PROPERTY_SLUGS, SYSTEM_SLUGS } from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { stableId } from '../util.js';

export interface SeedAsset {
  slug: string;
  id: string;
  organizationId: string;
  propertyId: string;
  systemId: string;
  /** Domain `AssetKind` enum value. */
  kind: string;
  identifier: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installedAt: Date | null;
  locationDescription: string | null;
  metadata: Record<string, unknown>;
}

export const ASSETS: SeedAsset[] = [
  {
    slug: ASSET_SLUGS.batteryRecorded,
    id: stableId(ASSET_SLUGS.batteryRecorded),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    systemId: stableId(SYSTEM_SLUGS.alarmPanel),
    kind: 'alarm_panel',
    identifier: 'panel_battery_recorded',
    manufacturer: 'Eagle-Picher',
    model: 'Carefree CFM12V18',
    serialNumber: null,
    installedAt: null,
    locationDescription: 'Recorded in last formal report',
    metadata: {
      role: 'recorded_in_report',
      sourceNote: 'Recorded in last formal report; serial unspecified',
    },
  },
  {
    slug: ASSET_SLUGS.batteryInstalled,
    id: stableId(ASSET_SLUGS.batteryInstalled),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    systemId: stableId(SYSTEM_SLUGS.alarmPanel),
    kind: 'alarm_panel',
    identifier: 'panel_battery_installed',
    manufacturer: 'Power-Sonic',
    model: 'PS-12180-NB',
    serialNumber: null,
    installedAt: new Date('2025-08-12T00:00:00-04:00'),
    locationDescription: 'Currently installed at panel',
    metadata: {
      role: 'physically_installed',
      sourceNote: 'Photographed at panel; identity mismatch vs recorded value',
    },
  },
  {
    slug: ASSET_SLUGS.pumpMotor,
    id: stableId(ASSET_SLUGS.pumpMotor),
    organizationId: DEFAULT_ORG_ID,
    propertyId: stableId(PROPERTY_SLUGS.cedar),
    systemId: stableId(SYSTEM_SLUGS.firePump),
    kind: 'fire_pump',
    identifier: 'pump_motor_main',
    manufacturer: 'Aurora',
    model: 'unspecified',
    serialNumber: null,
    installedAt: null,
    locationDescription: 'Pump room (basement)',
    metadata: { role: 'main_pump_motor' },
  },
];

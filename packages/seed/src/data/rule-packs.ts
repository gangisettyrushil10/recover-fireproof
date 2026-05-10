/**
 * Rule pack DB rows derived from `@fireproof/rules`'s ALL_PACKS registry.
 *
 * The seed imports the runtime pack defs (engine-shape) and projects them
 * into the `rule_packs` table shape. We carry the `requirements` summary
 * forward as a JSON array so the API can pre-load gates without re-running
 * the engine in dev.
 */

import { ALL_PACKS } from '@fireproof/rules/packs';
import { JURISDICTION_SLUGS, RULE_PACK_SLUGS } from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { stableId } from '../util.js';

export interface SeedRulePack {
  slug: string;
  id: string;
  organizationId: string;
  jurisdictionSlug: string;
  jurisdictionId: string;
  key: string;
  name: string;
  version: string;
  description: string;
  effectiveFrom: Date;
  sourceNote: string;
  status: 'active' | 'disabled';
  isActive: boolean;
  requirements: unknown[];
  metadata: Record<string, unknown>;
}

interface PackProjection {
  slug: string;
  jurisdictionSlug: string;
  description: string;
  /** PRD: Hartwell + Wessex active; Dunmoor disabled. */
  status: 'active' | 'disabled';
}

const PROJECTIONS: Record<string, PackProjection> = {
  hartwell_v1: {
    slug: RULE_PACK_SLUGS.hartwellV1,
    jurisdictionSlug: JURISDICTION_SLUGS.hartwell,
    description: 'Hartwell, MA — high-confidence MVP rule pack.',
    status: 'active',
  },
  wessex_v1: {
    slug: RULE_PACK_SLUGS.wessexV1,
    jurisdictionSlug: JURISDICTION_SLUGS.wessex,
    description: 'Wessex — medium-confidence rule pack with unspecified entries.',
    status: 'active',
  },
  dunmoor_v1: {
    slug: RULE_PACK_SLUGS.dunmoorV1,
    jurisdictionSlug: JURISDICTION_SLUGS.dunmoor,
    description: 'Dunmoor — low-confidence inferred pack; disabled until verified.',
    status: 'disabled',
  },
};

export const RULE_PACKS: SeedRulePack[] = Object.entries(ALL_PACKS).map(([key, pack]) => {
  const proj = PROJECTIONS[key];
  if (!proj) {
    throw new Error(`Seed: missing projection for rule pack '${key}'`);
  }
  return {
    slug: proj.slug,
    id: stableId(proj.slug),
    organizationId: DEFAULT_ORG_ID,
    jurisdictionSlug: proj.jurisdictionSlug,
    jurisdictionId: stableId(proj.jurisdictionSlug),
    key,
    name: `${proj.jurisdictionSlug.replace('jur_', '').replace(/^./, (c) => c.toUpperCase())} ${pack.version}`,
    version: pack.version,
    description: proj.description,
    effectiveFrom: new Date(pack.effectiveFrom),
    sourceNote: pack.sourceNote,
    status: proj.status,
    isActive: proj.status === 'active',
    // Flatten the engine `requires` arrays across all rules into a summary list
    // — handy for previewing gates without re-running the evaluator.
    requirements: pack.rules.flatMap((r) =>
      r.requires.map((req) => ({
        rule_id: r.id,
        evidence_type: req.evidence_type,
        cardinality: req.cardinality,
        required: req.required,
        notification_targets: req.notification_targets ?? null,
      })),
    ),
    metadata: {
      confidence: pack.confidence,
      ruleCount: pack.rules.length,
    },
  };
});

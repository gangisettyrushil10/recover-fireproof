/**
 * Cedar Heights canonical document set + their immutable versions.
 *
 * Each document carries one `is_original` version computed from a deterministic
 * text payload. The seed reads `assets/<slug>.txt`, hashes it, and writes the
 * pair (document, document_version) and the resulting blob to local storage.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCUMENT_SLUGS,
  EXCEPTION_SLUGS,
  PROPERTY_SLUGS,
  USER_SLUGS,
} from '../ids.js';
import { DEFAULT_ORG_ID } from './organizations.js';
import { sha256Hex, stableId, storageKeyFor, dayOffset } from '../util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '../../assets');

export interface SeedDocument {
  slug: string;
  id: string;
  organizationId: string;
  propertyId: string | null;
  exceptionSlug: string | null;
  sourceType:
    | 'report'
    | 'email'
    | 'photo'
    | 'audio'
    | 'voicemail'
    | 'log'
    | 'proposal'
    | 'certificate'
    | 'other';
  title: string;
  description: string;
  documentDate: Date;
  uploaderUserId: string;
  metadata: Record<string, unknown>;
}

export interface SeedDocumentVersion {
  documentSlug: string;
  documentId: string;
  organizationId: string;
  versionNo: number;
  sha256: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  isOriginal: boolean;
  uploadedAt: Date;
  uploaderUserId: string;
  /** Raw bytes — the orchestrator writes them to disk. */
  bytes: Buffer;
  metadata: Record<string, unknown>;
}

const cedarPropertyId = stableId(PROPERTY_SLUGS.cedar);
const lparkId = stableId(USER_SLUGS.lpark);

interface DocSpec {
  slug: string;
  exceptionSlug: string | null;
  sourceType: SeedDocument['sourceType'];
  mimeType: string;
  title: string;
  description: string;
  dayOffsetDays: number;
  body: string;
}

const SPECS: DocSpec[] = [
  {
    slug: DOCUMENT_SLUGS.carrierSurveyD416,
    exceptionSlug: EXCEPTION_SLUGS.carrier55a,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Continental Mutual loss-control survey (LC-55A)',
    description:
      'Day -416 carrier survey: pump acceptable but aging; impairment records live in handwritten log; recommend property mgmt retain copies.',
    dayOffsetDays: -416,
    body:
      'CONTINENTAL MUTUAL PROPERTY — LOSS CONTROL SURVEY (excerpt)\n' +
      '\nProperty: Cedar Heights Apartments — 1414 Cedar Ave., Hartwell, MA' +
      '\nFire pump: acceptable; aging; recommend overhaul plan.' +
      '\nImpairment records: contractor handwritten log only — recommend property mgmt retain copies.',
  },
  {
    slug: DOCUMENT_SLUGS.ahjRoutineD243,
    exceptionSlug: null,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Hartwell AHJ routine inspection',
    description:
      'Day -243 AHJ inspection: substantial compliance except pump certificate posting deficiency.',
    dayOffsetDays: -243,
    body:
      'CITY OF HARTWELL FIRE MARSHAL — ROUTINE INSPECTION (excerpt)\n' +
      '\nProperty: Cedar Heights Apartments\n' +
      'Findings: Substantial compliance noted. Deficiency: fire pump certificate not posted at panel.',
  },
  {
    slug: DOCUMENT_SLUGS.quarterlyD211,
    exceptionSlug: null,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Beacon quarterly ITM report',
    description:
      'Day -211 quarterly ITM. All systems satisfactory; no deficiencies noted (note: see internal email D-78).',
    dayOffsetDays: -211,
    body:
      'BEACON FIRE & SAFETY — QUARTERLY ITM REPORT (excerpt)\n' +
      '\nProperty: Cedar Heights Apartments\n' +
      'Wet sprinkler: satisfactory. Fire pump: satisfactory. Standpipe: satisfactory.\n' +
      'FDC: satisfactory. Alarm valve: satisfactory.\n' +
      'No deficiencies noted.',
  },
  {
    slug: DOCUMENT_SLUGS.trainingTranscriptD198,
    exceptionSlug: null,
    sourceType: 'other',
    mimeType: 'text/plain',
    title: 'Beacon technician training transcript',
    description:
      'Day -198 internal training transcript: actual field practice diverges from report language on main drains and impairment notifications.',
    dayOffsetDays: -198,
    body:
      'BEACON TRAINING — TRANSCRIPT (excerpt)\n' +
      '\nMike: Look, I tell the techs — we run the main drain, we eyeball the gauge, we say "pressure good." We do not always write down the static and residual numbers, but the report just says "satisfactory".',
  },
  {
    slug: DOCUMENT_SLUGS.impairmentLogD116,
    exceptionSlug: EXCEPTION_SLUGS.imp0116,
    sourceType: 'log',
    mimeType: 'image/jpeg',
    title: 'Handwritten impairment log — 9th-floor sprinkler',
    description:
      'Day -116. 9th-floor wet sprinkler zone out of service for frozen pipe repair. Started 07:40, restored ~13:30. "pressure good". AHJ notification unclear.',
    dayOffsetDays: -116,
    body:
      'HANDWRITTEN IMPAIRMENT LOG (transcribed)\n' +
      '\n9th floor sprinkler zone OOS for frozen pipe repair.\n' +
      'Start: 0740. Restored: ~1330. Fire watch noted (informal).\n' +
      'Main drain: pressure good. AHJ notification: ?',
  },
  {
    slug: DOCUMENT_SLUGS.emailThreadCorrosion,
    exceptionSlug: EXCEPTION_SLUGS.def9wCorr,
    sourceType: 'email',
    mimeType: 'message/rfc822',
    title: 'Internal email thread — 9W standpipe corrosion',
    description:
      'Day -78 to -47. Internal thread acknowledging corrosion on 9W standpipe hose connection; service proposal sent; customer non-response.',
    dayOffsetDays: -78,
    body:
      'EMAIL THREAD (Beacon internal)\n' +
      '\nFrom: M. DiSalvo  To: L. Park\n' +
      'Subject: 9W standpipe — corrosion\n' +
      '\nOn last quarter\'s walk I noticed flaking and pitting on the 9W hose connection. I left it off the formal report — let\'s just send a service proposal.',
  },
  {
    slug: DOCUMENT_SLUGS.proposal2026009,
    exceptionSlug: EXCEPTION_SLUGS.def9wCorr,
    sourceType: 'proposal',
    mimeType: 'application/pdf',
    title: 'Proposal #2026-009 — 9W standpipe service',
    description: 'Day -77. Service proposal sent to Steeplechase. Customer non-response to date.',
    dayOffsetDays: -77,
    body:
      'BEACON PROPOSAL #2026-009 (excerpt)\n' +
      '\nScope: Replace 9W hose connection (corrosion). Estimated parts/labor: $XXXX.\n' +
      'Customer: Steeplechase Property Management — Bryan.',
  },
  {
    slug: DOCUMENT_SLUGS.marshalVoicemailD3,
    exceptionSlug: null,
    sourceType: 'voicemail',
    mimeType: 'audio/mpeg',
    title: 'Marshal Reyes voicemail — request for originals',
    description:
      'Day +3 voicemail demanding clean originals, including impairment notifications that may not have been sent.',
    dayOffsetDays: 3,
    body:
      'VOICEMAIL TRANSCRIPT (Marshal Reyes)\n' +
      '\nThis is Marshal Reyes, City of Hartwell. I need originals. Not reprinted. Not modified. Including any impairment notifications you sent us — and any you did not.',
  },
  {
    slug: DOCUMENT_SLUGS.ownerRecordsDemandD4,
    exceptionSlug: null,
    sourceType: 'email',
    mimeType: 'message/rfc822',
    title: 'Owner records demand',
    description:
      'Day +4. Halberd Realty demands all records, emails, texts, voicemails, impairment logs, fire-watch records, and photographs.',
    dayOffsetDays: 4,
    body:
      'From: Halberd Realty Holdings  To: Beacon Fire & Safety\n' +
      'Subject: Records demand — Cedar Heights\n' +
      '\nProvide all records, emails, texts, voicemails, impairment logs, fire-watch records, and photographs.',
  },
  {
    slug: DOCUMENT_SLUGS.novD12,
    exceptionSlug: null,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Notice of Violation — Hartwell',
    description:
      'Day +12. NOV cites: pump discrepancy, missing post-impairment main drain proof, standpipe corrosion, battery mismatch, missing impairment notification.',
    dayOffsetDays: 12,
    body:
      'CITY OF HARTWELL FIRE MARSHAL — NOTICE OF VIOLATION (excerpt)\n' +
      '\n1. Fire pump performance discrepancy.\n' +
      '2. Missing post-impairment main drain proof.\n' +
      '3. Standpipe corrosion not addressed.\n' +
      '4. Alarm panel battery identity mismatch.\n' +
      '5. AHJ impairment notification not received.',
  },
  {
    slug: DOCUMENT_SLUGS.pumpTestPerf,
    exceptionSlug: EXCEPTION_SLUGS.pumpPerf,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Annual fire pump test — performance variance',
    description: '18% variance vs prior satisfactory result.',
    dayOffsetDays: -55,
    body:
      'BEACON FIRE PUMP TEST RECORD (excerpt)\n' +
      '\nChurn psi: nominal\n100% rated flow: 18% below prior result.\nResult: variance flagged for review.',
  },
  {
    slug: DOCUMENT_SLUGS.batteryPhoto,
    exceptionSlug: EXCEPTION_SLUGS.assetBattery,
    sourceType: 'photo',
    mimeType: 'image/jpeg',
    title: 'Photo — installed alarm panel battery plate',
    description:
      'Photograph of installed battery showing manufacturer Power-Sonic / model PS-12180-NB.',
    dayOffsetDays: -38,
    body:
      'PHOTO METADATA (placeholder)\n' +
      '\nVisible plate: Power-Sonic PS-12180-NB. Capacity: 18Ah.',
  },
  {
    slug: DOCUMENT_SLUGS.batteryPlateRecord,
    exceptionSlug: EXCEPTION_SLUGS.assetBattery,
    sourceType: 'report',
    mimeType: 'application/pdf',
    title: 'Recorded battery details (alarm panel)',
    description: 'Records show Eagle-Picher Carefree CFM12V18 — does not match installed unit.',
    dayOffsetDays: -300,
    body:
      'ASSET RECORD (excerpt)\n' +
      '\nAlarm panel battery: Eagle-Picher Carefree CFM12V18 (per last formal report).',
  },
];

export const DOCUMENTS: SeedDocument[] = SPECS.map((s) => ({
  slug: s.slug,
  id: stableId(s.slug),
  organizationId: DEFAULT_ORG_ID,
  propertyId: cedarPropertyId,
  exceptionSlug: s.exceptionSlug,
  sourceType: s.sourceType,
  title: s.title,
  description: s.description,
  documentDate: dayOffset(s.dayOffsetDays, '09:00:00'),
  uploaderUserId: lparkId,
  metadata: { mimeType: s.mimeType },
}));

export async function ensureAssetFile(slug: string, body: string): Promise<void> {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const file = path.join(ASSETS_DIR, `${slug}.txt`);
  try {
    const existing = await fs.readFile(file, 'utf8');
    if (existing === body) return;
  } catch {
    // not there yet
  }
  await fs.writeFile(file, body, 'utf8');
}

/** Build the version + bytes for a doc — pure compute, no I/O outside ensureAssetFile. */
export async function buildVersionForSpec(spec: DocSpec): Promise<SeedDocumentVersion> {
  await ensureAssetFile(spec.slug, spec.body);
  const bytes = Buffer.from(spec.body, 'utf8');
  const sha = sha256Hex(bytes);
  return {
    documentSlug: spec.slug,
    documentId: stableId(spec.slug),
    organizationId: DEFAULT_ORG_ID,
    versionNo: 1,
    sha256: sha,
    storageKey: storageKeyFor(sha),
    mimeType: spec.mimeType,
    byteSize: bytes.byteLength,
    isOriginal: true,
    uploadedAt: dayOffset(spec.dayOffsetDays, '09:00:00'),
    uploaderUserId: lparkId,
    bytes,
    metadata: {},
  };
}

export async function buildAllVersions(): Promise<SeedDocumentVersion[]> {
  return Promise.all(SPECS.map((s) => buildVersionForSpec(s)));
}

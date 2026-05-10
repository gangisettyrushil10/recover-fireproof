/**
 * Packet bundle builder.
 *
 * Pure-ish: the only IO concession is the `fetchBytes` callback the caller
 * passes in to retrieve original/derivative blobs. All filesystem and S3
 * concerns stay outside this library.
 *
 * Contents of the returned bundle:
 *   /manifest.json
 *   /manifest.csv
 *   /summary.pdf
 *   /export-receipt.pdf
 *   /originals/<sha256>.<ext>
 *   /derivatives/<sha256>.<ext>
 *   /audit/audit-trail.json
 */

import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format as formatDate } from 'date-fns';

import type {
  PacketBuildInput,
  PacketBundle,
  PacketManifest,
  PacketManifestDocument,
  PacketType,
} from '../types.js';
import { buildPacketManifest } from './manifest.js';
import { hashManifest } from '../audit/chain.js';
import { summarizeHolds } from '../holds/policy.js';

export type FetchBytes = (storage_key: string) => Promise<Buffer>;

// ─────────────────────────────────────────────────────────────────────────────
// Per-packet-type composition rules
// ─────────────────────────────────────────────────────────────────────────────

interface ComposedPacket {
  exceptions: PacketBuildInput['exceptions'];
  contradictions: PacketBuildInput['contradictions'];
  documents: PacketBuildInput['documents'];
  coverNarrative: string;
}

function compose(input: PacketBuildInput): ComposedPacket {
  switch (input.packet_type) {
    case 'AHJ_NOV_RESPONSE':
      return composeAhjNov(input);
    case 'OWNER_RESPONSE':
      return composeOwner(input);
    case 'INSURER_LOSS_CONTROL':
      return composeInsurer(input);
    case 'COUNSEL_SUBROGATION':
      return composeCounsel(input);
    default:
      return {
        exceptions: input.exceptions,
        contradictions: input.contradictions,
        documents: input.documents,
        coverNarrative: 'Packet export.',
      };
  }
}

function composeAhjNov(input: PacketBuildInput): ComposedPacket {
  const allowedExceptionTypes = new Set(['impairment', 'deficiency', 'asset_identity']);
  const exceptions = input.exceptions.filter(
    (e) =>
      allowedExceptionTypes.has(e.type) &&
      (e.severity === 'high' || e.severity === 'critical' || e.severity === 'medium_high'),
  );
  const allowedContradictionTypes = new Set([
    'omitted_known_deficiency',
    'timing_threshold_breach',
    'asset_identity_mismatch',
  ]);
  const contradictions = input.contradictions.filter((c) =>
    allowedContradictionTypes.has(c.type),
  );
  // For AHJ NOV, prefer original source documents.
  const documents = input.documents.filter((d) => d.is_original || d.source_type === 'report');
  return {
    exceptions,
    contradictions,
    documents,
    coverNarrative:
      'AHJ Notice of Violation Response. This packet collects the originating reports, deficiency correspondence, impairment evidence, and corrective-action plan for the cited items. Where contradictions between documents have been detected, they are listed and proposed resolutions are noted.',
  };
}

function composeOwner(input: PacketBuildInput): ComposedPacket {
  return {
    exceptions: input.exceptions,
    contradictions: input.contradictions.filter(
      (c) => c.severity !== 'low' && c.severity !== 'medium',
    ),
    documents: input.documents.filter((d) => d.included_as !== 'derivative'),
    coverNarrative:
      'Owner Response. This packet provides a plain-language summary of open exceptions, customer decisions on record, and the originals index for the property. Open risks and pending items are listed first.',
  };
}

function composeInsurer(input: PacketBuildInput): ComposedPacket {
  return {
    exceptions: input.exceptions,
    contradictions: input.contradictions,
    documents: input.documents.filter(
      (d) =>
        d.source_type === 'report' ||
        d.source_type === 'certificate' ||
        d.source_type === 'photo',
    ),
    coverNarrative:
      'Insurer / Loss Control Packet. Includes ITM history, recommendation status, restoration test records, and supporting photos with full chain-of-custody for each version.',
  };
}

function composeCounsel(input: PacketBuildInput): ComposedPacket {
  // Counsel: ALL documents — originals plus derivatives — and every contradiction.
  return {
    exceptions: input.exceptions,
    contradictions: input.contradictions,
    documents: input.documents,
    coverNarrative:
      'Counsel / Subrogation Packet. Contains every original source document, every derivative, the chain-of-custody manifest, the contradiction log, and the legal-hold summary. Audit trail is included in /audit/audit-trail.json.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function buildPacketBundle(
  input: PacketBuildInput,
  fetchBytes: FetchBytes,
): Promise<PacketBundle> {
  const composed = compose(input);

  // 1. Manifest first — totals and ordering are derived here.
  const { manifestJson, manifestCsv } = buildPacketManifest({
    packet_id: input.packet_id,
    packet_type: input.packet_type,
    property_id: input.property_id,
    generated_at: input.generated_at,
    generated_by: input.generated_by,
    legal_hold_active: input.legal_hold_active,
    exceptions: composed.exceptions,
    contradictions: composed.contradictions,
    documents: composed.documents,
  });

  const manifestJsonBuffer = Buffer.from(JSON.stringify(manifestJson, null, 2), 'utf8');
  const manifestCsvBuffer = Buffer.from(manifestCsv, 'utf8');
  const manifestSha256 = hashManifest(manifestJsonBuffer);

  // 2. PDFs (after manifest so we can embed totals + sha).
  const summaryPdfBuffer = await renderSummaryPdf({
    manifest: manifestJson,
    coverNarrative: composed.coverNarrative,
    holdsSummary: summarizeHolds(input.holds),
  });

  const exportReceiptPdfBuffer = await renderExportReceiptPdf({
    manifest: manifestJson,
    manifestSha256,
    holdsSummary: summarizeHolds(input.holds),
  });

  // 3. ZIP (streaming archiver into a buffer).
  const zipBuffer = await buildZip({
    manifestJsonBuffer,
    manifestCsvBuffer,
    summaryPdfBuffer,
    exportReceiptPdfBuffer,
    manifest: manifestJson,
    rawDocuments: composed.documents,
    auditEvents: input.audit.events,
    fetchBytes,
  });

  return {
    manifestJsonBuffer,
    manifestCsvBuffer,
    summaryPdfBuffer,
    exportReceiptPdfBuffer,
    zipBuffer,
    manifestSha256,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary PDF
// ─────────────────────────────────────────────────────────────────────────────

interface SummaryPdfInput {
  manifest: PacketManifest;
  coverNarrative: string;
  holdsSummary: ReturnType<typeof summarizeHolds>;
}

async function renderSummaryPdf(input: SummaryPdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Cover page
  drawSummaryCover(pdf, helv, helvBold, input);

  // Exception timeline page
  drawExceptionsPage(pdf, helv, helvBold, input.manifest);

  // Contradictions page
  drawContradictionsPage(pdf, helv, helvBold, input.manifest);

  // Documents index page
  drawDocumentsIndexPage(pdf, helv, helvBold, input.manifest);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

function drawSummaryCover(
  pdf: PDFDocument,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  input: SummaryPdfInput,
): void {
  const page = pdf.addPage([612, 792]);
  const { manifest } = input;
  let y = 740;
  const left = 56;
  const right = 612 - 56;
  const lineHeight = 16;

  page.drawText('Fireproof Packet Summary', {
    x: left,
    y,
    size: 22,
    font: helvBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  drawKeyValue(page, helv, helvBold, left, y, 'Packet ID', manifest.packet_id);
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Packet Type', humanizePacketType(manifest.packet_type));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Property ID', manifest.property_id);
  y -= lineHeight;
  drawKeyValue(
    page,
    helv,
    helvBold,
    left,
    y,
    'Generated At',
    formatIsoForDisplay(manifest.generated_at),
  );
  y -= lineHeight;
  drawKeyValue(
    page,
    helv,
    helvBold,
    left,
    y,
    'Generated By',
    `${manifest.generated_by.user_id} (${manifest.generated_by.role})`,
  );
  y -= lineHeight * 1.5;

  if (manifest.legal_hold_active) {
    page.drawText('LEGAL HOLD ACTIVE', { x: left, y, size: 14, font: helvBold });
    y -= lineHeight;
    page.drawText(
      `Active holds: ${input.holdsSummary.total_active}; subjects under hold: ${input.holdsSummary.total_subjects}.`,
      { x: left, y, size: 11, font: helv },
    );
    y -= lineHeight;
    page.drawText(
      'Originals scoped under an active hold cannot be deleted or overwritten.',
      { x: left, y, size: 11, font: helv },
    );
    y -= lineHeight * 1.5;
  }

  page.drawText('Cover Memo', { x: left, y, size: 14, font: helvBold });
  y -= lineHeight;
  y = drawWrappedText(page, helv, input.coverNarrative, left, y, right - left, 11, lineHeight);
  y -= lineHeight;

  page.drawText('Totals', { x: left, y, size: 14, font: helvBold });
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Documents', String(manifest.totals.documents));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Originals', String(manifest.totals.originals));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Derivatives', String(manifest.totals.derivatives));
  y -= lineHeight;
  drawKeyValue(
    page,
    helv,
    helvBold,
    left,
    y,
    'Total Bytes',
    String(manifest.totals.byte_size_total),
  );
}

function drawExceptionsPage(
  pdf: PDFDocument,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  manifest: PacketManifest,
): void {
  const page = pdf.addPage([612, 792]);
  const left = 56;
  const right = 612 - 56;
  const lineHeight = 14;
  let y = 740;

  page.drawText('Exception Timeline', { x: left, y, size: 18, font: helvBold });
  y -= 28;

  if (manifest.exception_summary.length === 0) {
    page.drawText('No exceptions in scope.', { x: left, y, size: 11, font: helv });
    return;
  }

  for (const exc of manifest.exception_summary) {
    if (y < 80) {
      const np = pdf.addPage([612, 792]);
      drawExceptionsPageContinuation(np, helv, helvBold, manifest, manifest.exception_summary.indexOf(exc));
      return;
    }
    page.drawText(`[${humanizeSeverity(exc.severity)}] ${exc.title}`, {
      x: left,
      y,
      size: 11,
      font: helvBold,
    });
    y -= lineHeight;
    const stateLine = `Type: ${exc.type}   State: ${exc.state}   Opened: ${formatIsoForDisplay(exc.opened_at)}   Closed: ${exc.closed_at ? formatIsoForDisplay(exc.closed_at) : 'open'}`;
    y = drawWrappedText(page, helv, stateLine, left, y, right - left, 10, lineHeight);
    y -= lineHeight * 0.5;
  }
}

function drawExceptionsPageContinuation(
  page: import('pdf-lib').PDFPage,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  manifest: PacketManifest,
  startIdx: number,
): void {
  let y = 740;
  const left = 56;
  const right = 612 - 56;
  const lineHeight = 14;
  page.drawText('Exception Timeline (cont.)', { x: left, y, size: 16, font: helvBold });
  y -= 24;
  for (let i = startIdx; i < manifest.exception_summary.length; i++) {
    const exc = manifest.exception_summary[i]!;
    if (y < 80) return;
    page.drawText(`[${humanizeSeverity(exc.severity)}] ${exc.title}`, {
      x: left,
      y,
      size: 11,
      font: helvBold,
    });
    y -= lineHeight;
    const stateLine = `Type: ${exc.type}   State: ${exc.state}   Opened: ${formatIsoForDisplay(exc.opened_at)}   Closed: ${exc.closed_at ? formatIsoForDisplay(exc.closed_at) : 'open'}`;
    y = drawWrappedText(page, helv, stateLine, left, y, right - left, 10, lineHeight);
    y -= lineHeight * 0.5;
  }
}

function drawContradictionsPage(
  pdf: PDFDocument,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  manifest: PacketManifest,
): void {
  const page = pdf.addPage([612, 792]);
  const left = 56;
  const right = 612 - 56;
  const lineHeight = 14;
  let y = 740;
  page.drawText('Contradictions', { x: left, y, size: 18, font: helvBold });
  y -= 28;

  if (manifest.contradictions_summary.length === 0) {
    page.drawText('No contradictions detected in this scope.', {
      x: left,
      y,
      size: 11,
      font: helv,
    });
    return;
  }

  for (const c of manifest.contradictions_summary) {
    if (y < 80) break;
    page.drawText(`${humanizeContradictionType(c.type)} [${humanizeSeverity(c.severity)}]`, {
      x: left,
      y,
      size: 11,
      font: helvBold,
    });
    y -= lineHeight;
    const detail = `id: ${c.id}   confidence: ${c.confidence.toFixed(2)}`;
    y = drawWrappedText(page, helv, detail, left, y, right - left, 10, lineHeight);
    y -= lineHeight * 0.5;
  }
}

function drawDocumentsIndexPage(
  pdf: PDFDocument,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  manifest: PacketManifest,
): void {
  let page = pdf.addPage([612, 792]);
  const left = 56;
  const right = 612 - 56;
  const lineHeight = 12;
  let y = 740;
  page.drawText('Documents Index', { x: left, y, size: 18, font: helvBold });
  y -= 24;
  page.drawText('order  type     orig  hash (first 12)  title', {
    x: left,
    y,
    size: 9,
    font: helvBold,
  });
  y -= lineHeight;

  for (const d of manifest.documents) {
    if (y < 60) {
      page = pdf.addPage([612, 792]);
      y = 740;
      page.drawText('Documents Index (cont.)', { x: left, y, size: 16, font: helvBold });
      y -= 24;
    }
    const line = `${String(d.order_index).padStart(3, ' ')}    ${d.source_type.padEnd(10, ' ')}${d.is_original ? 'Y   ' : 'N   '}${d.sha256.slice(0, 12)}    ${d.title}`;
    y = drawWrappedText(page, helv, line, left, y, right - left, 9, lineHeight);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export receipt PDF (single page)
// ─────────────────────────────────────────────────────────────────────────────

interface ReceiptInput {
  manifest: PacketManifest;
  manifestSha256: string;
  holdsSummary: ReturnType<typeof summarizeHolds>;
}

async function renderExportReceiptPdf(input: ReceiptInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const left = 56;
  const lineHeight = 16;
  let y = 740;

  page.drawText('Fireproof Export Receipt', { x: left, y, size: 22, font: helvBold });
  y -= 30;

  const m = input.manifest;
  drawKeyValue(page, helv, helvBold, left, y, 'Packet ID', m.packet_id);
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Packet Type', humanizePacketType(m.packet_type));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Property ID', m.property_id);
  y -= lineHeight;
  drawKeyValue(
    page,
    helv,
    helvBold,
    left,
    y,
    'Exported By',
    `${m.generated_by.user_id} (${m.generated_by.role}, org ${m.generated_by.organization_id})`,
  );
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Exported At', formatIsoForDisplay(m.generated_at));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'File Count', String(m.totals.documents));
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Total Bytes', String(m.totals.byte_size_total));
  y -= lineHeight;
  drawKeyValue(
    page,
    helv,
    helvBold,
    left,
    y,
    'Legal Hold Active',
    m.legal_hold_active ? 'YES' : 'NO',
  );
  y -= lineHeight;
  drawKeyValue(page, helv, helvBold, left, y, 'Manifest SHA-256', input.manifestSha256);
  y -= lineHeight * 1.5;

  page.drawText('This receipt is the auditable record that the named user produced the named packet.', {
    x: left,
    y,
    size: 10,
    font: helv,
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP archive
// ─────────────────────────────────────────────────────────────────────────────

interface BuildZipInput {
  manifestJsonBuffer: Buffer;
  manifestCsvBuffer: Buffer;
  summaryPdfBuffer: Buffer;
  exportReceiptPdfBuffer: Buffer;
  manifest: PacketManifest;
  rawDocuments: PacketBuildInput['documents'];
  auditEvents: unknown[];
  fetchBytes: FetchBytes;
}

async function buildZip(input: BuildZipInput): Promise<Buffer> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const sink = new PassThrough();
  sink.on('data', (chunk: Buffer) => chunks.push(chunk));
  archive.pipe(sink);

  archive.append(input.manifestJsonBuffer, { name: 'manifest.json' });
  archive.append(input.manifestCsvBuffer, { name: 'manifest.csv' });
  archive.append(input.summaryPdfBuffer, { name: 'summary.pdf' });
  archive.append(input.exportReceiptPdfBuffer, { name: 'export-receipt.pdf' });

  // Map raw inputs by document_version_id to access storage_keys.
  const rawByVersionId = new Map<string, BuildZipInput['rawDocuments'][number]>();
  for (const d of input.rawDocuments) rawByVersionId.set(d.document_version_id, d);

  for (const doc of input.manifest.documents) {
    const raw = rawByVersionId.get(doc.document_version_id);
    if (!raw) continue;
    let bytes: Buffer;
    try {
      bytes = await input.fetchBytes(raw.storage_key);
    } catch {
      // Skip a missing blob; the manifest still records its sha and ordering.
      continue;
    }
    const ext = mimeToExt(doc.mime_type) ?? 'bin';
    const dir = doc.is_original ? 'originals' : 'derivatives';
    archive.append(bytes, { name: `${dir}/${doc.sha256}.${ext}` });
  }

  // /audit/audit-trail.json
  const auditPayload = JSON.stringify(
    {
      packet_id: input.manifest.packet_id,
      generated_at: input.manifest.generated_at,
      events: input.auditEvents,
    },
    null,
    2,
  );
  archive.append(Buffer.from(auditPayload, 'utf8'), { name: 'audit/audit-trail.json' });

  // Register listeners BEFORE finalize so we don't miss the end event.
  const done = new Promise<void>((resolve, reject) => {
    sink.on('end', () => resolve());
    sink.on('finish', () => resolve());
    sink.on('error', (e) => reject(e));
    archive.on('error', (e) => reject(e));
  });
  void archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mimeToExt(mime: string): string | null {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/json': 'json',
    'application/zip': 'zip',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/tiff': 'tiff',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'text/html': 'html',
    'message/rfc822': 'eml',
  };
  return map[mime.toLowerCase()] ?? null;
}

function humanizePacketType(t: PacketType): string {
  switch (t) {
    case 'AHJ_NOV_RESPONSE':
      return 'AHJ NOV Response';
    case 'OWNER_RESPONSE':
      return 'Owner Response';
    case 'INSURER_LOSS_CONTROL':
      return 'Insurer / Loss Control';
    case 'COUNSEL_SUBROGATION':
      return 'Counsel / Subrogation';
    default:
      return t;
  }
}

function humanizeSeverity(s: string): string {
  return s.replace('_', ' ').toUpperCase();
}

function humanizeContradictionType(t: string): string {
  return t.replace(/_/g, ' ');
}

function formatIsoForDisplay(iso: string): string {
  try {
    return formatDate(new Date(iso), 'yyyy-MM-dd HH:mm:ssXXX');
  } catch {
    return iso;
  }
}

function drawKeyValue(
  page: import('pdf-lib').PDFPage,
  helv: import('pdf-lib').PDFFont,
  helvBold: import('pdf-lib').PDFFont,
  x: number,
  y: number,
  key: string,
  value: string,
): void {
  page.drawText(`${key}:`, { x, y, size: 11, font: helvBold });
  page.drawText(value, { x: x + 110, y, size: 11, font: helv });
}

/**
 * Naive width-bounded line wrapping for plain ASCII strings. Returns the
 * new y cursor after writing.
 */
function drawWrappedText(
  page: import('pdf-lib').PDFPage,
  font: import('pdf-lib').PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  lineHeight: number,
): number {
  const safe = sanitizeForPdf(text);
  const words = safe.split(/\s+/);
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font });
    cursorY -= lineHeight;
  }
  return cursorY;
}

/** Strip non-WinAnsi characters Helvetica can't render (e.g. emojis). */
function sanitizeForPdf(s: string): string {
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

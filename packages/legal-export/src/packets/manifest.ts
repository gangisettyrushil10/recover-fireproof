/**
 * Manifest builder — pure JSON+CSV.
 *
 * `buildPacketManifest` is the deterministic core of every packet export.
 * Document ordering is stable: by source_type, then by document_date
 * (oldest first; nulls last), then by document_version_id. Totals are
 * derived; callers cannot disagree with the manifest about counts/bytes.
 */

import type {
  PacketDocumentInput,
  PacketInput,
  PacketManifest,
  PacketManifestDocument,
  PacketManifestTotals,
} from '../types.js';
import { PACKET_MANIFEST_SCHEMA_VERSION } from '../types.js';

const STABLE_SOURCE_ORDER: Record<string, number> = {
  report: 1,
  certificate: 2,
  proposal: 3,
  email: 4,
  voicemail: 5,
  audio: 6,
  log: 7,
  photo: 8,
  other: 9,
};

function compareDocs(a: PacketManifestDocument, b: PacketManifestDocument): number {
  const sa = STABLE_SOURCE_ORDER[a.source_type] ?? 99;
  const sb = STABLE_SOURCE_ORDER[b.source_type] ?? 99;
  if (sa !== sb) return sa - sb;
  const da = a.document_date ? Date.parse(a.document_date) : Number.POSITIVE_INFINITY;
  const db = b.document_date ? Date.parse(b.document_date) : Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return a.document_version_id.localeCompare(b.document_version_id);
}

function classifyIncludedAs(d: PacketDocumentInput): PacketManifestDocument['included_as'] {
  if (d.included_as) return d.included_as;
  return d.is_original ? 'original' : 'derivative';
}

export function buildPacketManifest(input: PacketInput): {
  manifestJson: PacketManifest;
  manifestCsv: string;
} {
  // Apply stable ordering then assign 1-based order_index.
  const ordered = [...input.documents]
    .map<PacketManifestDocument>((d) => ({
      document_version_id: d.document_version_id,
      document_id: d.document_id,
      version_no: d.version_no,
      sha256: d.sha256,
      mime_type: d.mime_type,
      byte_size: d.byte_size,
      is_original: d.is_original,
      hold_status: d.hold_status,
      source_type: d.source_type,
      title: d.title,
      document_date: d.document_date ?? null,
      included_as: classifyIncludedAs(d),
      order_index: 0,
    }))
    .sort(compareDocs)
    .map((d, idx) => ({ ...d, order_index: idx + 1 }));

  const totals: PacketManifestTotals = ordered.reduce(
    (acc, d) => {
      acc.documents += 1;
      acc.byte_size_total += d.byte_size;
      if (d.is_original) acc.originals += 1;
      else acc.derivatives += 1;
      return acc;
    },
    { documents: 0, originals: 0, derivatives: 0, byte_size_total: 0 } as PacketManifestTotals,
  );

  const manifestJson: PacketManifest = {
    packet_id: input.packet_id,
    packet_type: input.packet_type,
    property_id: input.property_id,
    generated_at: input.generated_at,
    generated_by: input.generated_by,
    legal_hold_active: input.legal_hold_active,
    exception_summary: input.exceptions,
    contradictions_summary: input.contradictions,
    documents: ordered,
    totals,
    schema_version: PACKET_MANIFEST_SCHEMA_VERSION,
  };

  const manifestCsv = renderManifestCsv(ordered);

  return { manifestJson, manifestCsv };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'order_index',
  'document_version_id',
  'document_id',
  'version_no',
  'sha256',
  'byte_size',
  'mime_type',
  'is_original',
  'hold_status',
  'source_type',
  'title',
  'included_as',
] as const;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function renderManifestCsv(docs: PacketManifestDocument[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = docs.map((d) =>
    [
      d.order_index,
      d.document_version_id,
      d.document_id,
      d.version_no,
      d.sha256,
      d.byte_size,
      d.mime_type,
      d.is_original ? 'true' : 'false',
      d.hold_status,
      d.source_type,
      d.title,
      d.included_as,
    ]
      .map(csvEscape)
      .join(','),
  );
  // Use CRLF line endings — friendliest to Excel and Google Sheets.
  return [header, ...lines].join('\r\n') + '\r\n';
}

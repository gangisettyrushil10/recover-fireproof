import { describe, expect, it } from 'vitest';
import { buildPacketManifest } from '../src/packets/manifest.js';
import type { PacketDocumentInput, PacketInput } from '../src/types.js';

function doc(overrides: Partial<PacketDocumentInput>): PacketDocumentInput {
  return {
    document_version_id: 'dv-1' as never,
    document_id: 'doc-1' as never,
    version_no: 1,
    sha256: 'a'.repeat(64),
    mime_type: 'application/pdf',
    byte_size: 1024,
    is_original: true,
    hold_status: 'none',
    source_type: 'report',
    title: 'Quarterly ITM Report',
    storage_key: 'k/dv-1',
    document_date: '2025-12-15T00:00:00-05:00',
    ...overrides,
  };
}

describe('buildPacketManifest', () => {
  const baseInput: PacketInput = {
    packet_id: 'pkt-1' as never,
    packet_type: 'AHJ_NOV_RESPONSE',
    property_id: 'prop_cedar' as never,
    generated_at: '2026-05-09T12:00:00-04:00',
    generated_by: {
      user_id: 'u-1' as never,
      role: 'office',
      organization_id: 'org-1' as never,
    },
    legal_hold_active: false,
    exceptions: [],
    contradictions: [],
    documents: [
      doc({ document_version_id: 'dv-photo' as never, source_type: 'photo', sha256: 'b'.repeat(64), is_original: false, byte_size: 50 }),
      doc({ document_version_id: 'dv-report-old' as never, document_date: '2025-09-15T00:00:00-04:00', sha256: 'c'.repeat(64), byte_size: 200 }),
      doc({ document_version_id: 'dv-report-new' as never, document_date: '2025-12-15T00:00:00-05:00', sha256: 'd'.repeat(64), byte_size: 300 }),
    ],
  };

  it('orders documents by source_type then date then id', () => {
    const { manifestJson } = buildPacketManifest(baseInput);
    const ids = manifestJson.documents.map((d) => d.document_version_id);
    // Reports come before photos; within reports, the older date is first.
    expect(ids).toEqual(['dv-report-old', 'dv-report-new', 'dv-photo']);
    expect(manifestJson.documents[0]?.order_index).toBe(1);
    expect(manifestJson.documents[2]?.order_index).toBe(3);
  });

  it('computes deterministic totals', () => {
    const { manifestJson } = buildPacketManifest(baseInput);
    expect(manifestJson.totals.documents).toBe(3);
    expect(manifestJson.totals.originals).toBe(2);
    expect(manifestJson.totals.derivatives).toBe(1);
    expect(manifestJson.totals.byte_size_total).toBe(550);
    expect(manifestJson.schema_version).toBe('1.0');
  });

  it('emits CSV with the agreed column order', () => {
    const { manifestCsv } = buildPacketManifest(baseInput);
    const [header] = manifestCsv.split('\r\n');
    expect(header).toBe(
      'order_index,document_version_id,document_id,version_no,sha256,byte_size,mime_type,is_original,hold_status,source_type,title,included_as',
    );
  });
});

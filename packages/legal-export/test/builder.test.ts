import { describe, expect, it } from 'vitest';
import { buildPacketBundle } from '../src/packets/builder.js';
import type { PacketBuildInput } from '../src/types.js';

// Tiny ZIP local-file-header scanner — sufficient to verify that all expected
// entry names are present without adding a yauzl/adm-zip dep just for tests.

function listZipEntries(buffer: Buffer): string[] {
  // Walk Local File Headers (signature 0x04034b50). This is sufficient for
  // verifying entry names because archiver writes them in order.
  const sig = 0x04034b50;
  const names: string[] = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const s = buffer.readUInt32LE(offset);
    if (s !== sig) break;
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + fileNameLen).toString('utf8');
    names.push(name);
    offset += 30 + fileNameLen + extraLen + compressedSize;
  }
  return names;
}

const baseInput: PacketBuildInput = {
  packet_id: 'pkt-counsel' as never,
  packet_type: 'COUNSEL_SUBROGATION',
  property_id: 'prop_cedar' as never,
  generated_at: '2026-05-09T12:00:00-04:00',
  generated_by: {
    user_id: 'u-1' as never,
    role: 'office',
    organization_id: 'org-1' as never,
  },
  legal_hold_active: true,
  exceptions: [
    {
      exception_id: 'exc_imp_0116' as never,
      type: 'impairment',
      state: 'restored_evidence_incomplete',
      severity: 'critical',
      opened_at: '2026-01-05T07:40:00-05:00',
      closed_at: '2026-01-05T13:30:00-05:00',
      title: '9th-floor wet sprinkler zone out of service for frozen-pipe repair',
    },
  ],
  contradictions: [
    {
      id: 'contra-1',
      type: 'timing_threshold_breach',
      severity: 'high',
      confidence: 0.95,
    },
  ],
  documents: [
    {
      document_version_id: 'dv-report' as never,
      document_id: 'doc-report' as never,
      version_no: 1,
      sha256: 'a'.repeat(64),
      mime_type: 'application/pdf',
      byte_size: 1024,
      is_original: true,
      hold_status: 'active',
      source_type: 'report',
      title: 'Quarterly ITM Report',
      storage_key: 'k/dv-report',
      document_date: '2025-12-15T00:00:00-05:00',
    },
    {
      document_version_id: 'dv-photo' as never,
      document_id: 'doc-photo' as never,
      version_no: 1,
      sha256: 'b'.repeat(64),
      mime_type: 'image/jpeg',
      byte_size: 2048,
      is_original: false,
      hold_status: 'active',
      source_type: 'photo',
      title: 'Standpipe corrosion photo (annotated derivative)',
      storage_key: 'k/dv-photo',
      document_date: '2025-12-15T00:00:00-05:00',
    },
  ],
  holds: [
    {
      id: 'hold-1' as never,
      organization_id: 'org-1' as never,
      name: 'Cedar Heights post-incident hold',
      reason: 'Litigation hold issued by counsel',
      status: 'active',
      subjects: [{ kind: 'property', id: 'prop_cedar' }],
      issued_by_user_id: null,
      issued_at: '2026-01-08T09:00:00-05:00',
      released_by_user_id: null,
      released_at: null,
      release_reason: null,
      metadata: {},
      created_at: '2026-01-08T09:00:00-05:00',
      updated_at: '2026-01-08T09:00:00-05:00',
    },
  ],
  audit: {
    events: [
      { action: 'packet.created', subject: 'pkt-counsel' },
      { action: 'document_version.created', subject: 'dv-report' },
    ],
  },
};

describe('buildPacketBundle', () => {
  it('produces a valid bundle with all expected entries', async () => {
    const fetchBytes = async (key: string): Promise<Buffer> => {
      if (key === 'k/dv-report') return Buffer.from('%PDF-1.4 fake report\n');
      if (key === 'k/dv-photo') return Buffer.from('JFIF fake photo bytes');
      throw new Error(`unknown key: ${key}`);
    };
    const bundle = await buildPacketBundle(baseInput, fetchBytes);

    expect(bundle.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.manifestJsonBuffer.length).toBeGreaterThan(0);
    expect(bundle.summaryPdfBuffer.slice(0, 4).toString('utf8')).toBe('%PDF');
    expect(bundle.exportReceiptPdfBuffer.slice(0, 4).toString('utf8')).toBe('%PDF');

    const names = listZipEntries(bundle.zipBuffer);
    expect(names).toContain('manifest.json');
    expect(names).toContain('manifest.csv');
    expect(names).toContain('summary.pdf');
    expect(names).toContain('export-receipt.pdf');
    expect(names).toContain('audit/audit-trail.json');
    expect(names.some((n) => n.startsWith('originals/'))).toBe(true);
    expect(names.some((n) => n.startsWith('derivatives/'))).toBe(true);
  });
});


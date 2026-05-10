/**
 * Packet worker.
 *
 * Consumes the `packets` queue. For each job:
 *   1. Load packet row via the DB port.
 *   2. Gather scoped exceptions, document versions, contradictions,
 *      audit events, and active holds.
 *   3. Translate into PacketBuildInput and call buildPacketBundle.
 *   4. Persist artifacts via the storage adapter.
 *   5. Update the packet row (manifest_json, status='ready') and insert
 *      packet_items rows.
 */

import { Worker, type ConnectionOptions } from 'bullmq';
import {
  buildPacketBundle,
  LegalToDomainContradictionType,
  type LegalContradictionType,
  type PacketBuildInput,
  type PacketDocumentInput,
} from '@fireproof/legal-export';
import { QUEUE_NAMES, type PacketJobPayload } from '../queue.js';
import type { PacketDb } from '../db-port.js';
import type { StorageAdapter } from '../storage.js';
import type { Logger } from '../logger.js';

interface PacketWorkerDeps {
  connection: ConnectionOptions;
  db: PacketDb;
  storage: StorageAdapter;
  logger: Logger;
  /** Optional concurrency override. */
  concurrency?: number;
}

export function createPacketWorker(deps: PacketWorkerDeps): Worker<PacketJobPayload> {
  const { connection, db, storage, logger } = deps;
  return new Worker<PacketJobPayload>(
    QUEUE_NAMES.packets,
    async (job) => {
      const log = logger.child({ jobId: job.id, packet_id: job.data.packet_id });
      log.info({ payload: job.data }, 'packet job received');

      const packet = await db.loadPacket(job.data.packet_id);
      const exceptions = await db.loadExceptionsForScope({
        property_id: job.data.property_id,
        exception_ids: job.data.exception_ids,
      });
      const versions = await db.loadDocumentVersionsForScope({
        property_id: job.data.property_id,
        exception_ids: job.data.exception_ids,
      });
      const contradictions = await db.loadContradictionsForScope({
        property_id: job.data.property_id,
        exception_ids: job.data.exception_ids,
      });
      const audit = await db.loadAuditEventsForScope({
        property_id: job.data.property_id,
        exception_ids: job.data.exception_ids,
      });
      const holds = await db.loadActiveHoldsForScope({ property_id: job.data.property_id });

      const docs: PacketDocumentInput[] = versions.map((v) => ({
        document_version_id: v.document_version_id as never,
        document_id: v.document_id as never,
        version_no: v.version_no,
        sha256: v.sha256 as never,
        byte_size: v.byte_size,
        mime_type: v.mime_type,
        is_original: v.is_original,
        hold_status: v.hold_status,
        source_type: v.source_type,
        title: v.title,
        document_date: v.document_date,
        storage_key: v.storage_key,
      }));

      const input: PacketBuildInput = {
        packet_id: packet.packet_id,
        packet_type: packet.packet_type,
        property_id: packet.property_id,
        generated_at: new Date().toISOString(),
        generated_by: {
          user_id: packet.requested_by_user_id as never,
          role: packet.requested_by_role,
          organization_id: packet.organization_id as never,
        },
        legal_hold_active: holds.some((h) => h.status === 'active'),
        exceptions: exceptions.map((e) => ({
          exception_id: e.id,
          type: e.type,
          state: e.state,
          severity: e.severity,
          opened_at: e.opened_at,
          closed_at: e.closed_at,
          title: e.title,
        })),
        contradictions: contradictions.map((c) => ({
          id: c.id,
          // Map domain type back to library type when possible (fallback to "other").
          type: domainToLegalContradictionType(c.type),
          severity: c.severity,
          confidence: c.confidence,
        })),
        documents: docs,
        holds,
        audit: { events: audit },
      };

      const bundle = await buildPacketBundle(input, async (key) => storage.get(key));

      // Persist all artifacts under the packet's directory.
      const root = `packets/${packet.packet_id}`;
      await storage.put(`${root}/manifest.json`, bundle.manifestJsonBuffer);
      await storage.put(`${root}/manifest.csv`, bundle.manifestCsvBuffer);
      await storage.put(`${root}/summary.pdf`, bundle.summaryPdfBuffer);
      await storage.put(`${root}/export-receipt.pdf`, bundle.exportReceiptPdfBuffer);
      await storage.put(`${root}/bundle.zip`, bundle.zipBuffer);

      await db.finalizePacket({
        packet_id: packet.packet_id,
        manifest_json: JSON.parse(bundle.manifestJsonBuffer.toString('utf8')) as Record<string, unknown>,
        artifact_storage_key: `${root}/bundle.zip`,
        items: docs.map((d, i) => ({
          document_version_id: d.document_version_id,
          kind: 'document_version',
          position: i,
          title: d.title,
        })),
      });

      log.info(
        {
          manifest_sha256: bundle.manifestSha256,
          documents: docs.length,
          zip_bytes: bundle.zipBuffer.byteLength,
        },
        'packet job completed',
      );

      return {
        manifest_sha256: bundle.manifestSha256,
        artifact_storage_key: `${root}/bundle.zip`,
      };
    },
    { connection, concurrency: deps.concurrency ?? 2 },
  );
}

/** Best-effort reverse mapping: domain ContradictionType → library type. */
function domainToLegalContradictionType(t: string): LegalContradictionType {
  for (const [legal, domain] of Object.entries(LegalToDomainContradictionType)) {
    if (domain === t) return legal as LegalContradictionType;
  }
  // Fallback when domain type is "other" or unmapped.
  return 'report_vs_internal_note';
}

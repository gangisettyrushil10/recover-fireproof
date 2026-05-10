/**
 * Manifest hashing and export receipt construction.
 *
 * Pure — no IO. The backend invokes `hashManifest` to compute the
 * content-addressable identifier for the manifest bytes, then calls
 * `buildExportReceipt` to produce a structured receipt the API layer
 * persists as an audit event.
 */

import { createHash } from 'node:crypto';
import type { ExportReceipt, ExportReceiptInput } from '../types.js';

/** Hex SHA-256 of the manifest JSON bytes. */
export function hashManifest(manifestJsonBuffer: Buffer | Uint8Array): string {
  const h = createHash('sha256');
  h.update(manifestJsonBuffer);
  return h.digest('hex');
}

/** Build a structured export receipt; the API persists this to audit_events. */
export function buildExportReceipt(input: ExportReceiptInput): ExportReceipt {
  return { ...input, schema_version: '1.0' };
}

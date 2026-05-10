/**
 * Seed utilities — deterministic IDs, hashing, and small fixture helpers.
 *
 * Every seeded business row keys off a stable string slug (e.g. `org_beacon`).
 * The Backend Drizzle schema, however, uses `uuid` primary keys. To bridge the
 * two we derive a UUIDv5 from each slug using a fixed namespace UUID. The
 * mapping is therefore deterministic and reproducible across machines without
 * needing to persist a slug→uuid table.
 */

import { createHash } from 'node:crypto';

/**
 * Fixed namespace UUID for all Fireproof seed slugs. Documented and stable —
 * do NOT change this value, otherwise every seeded row would map to a new ID.
 */
export const SEED_NAMESPACE_UUID = 'f1ce0000-0000-0000-0000-000000000001';

/**
 * UUIDv5 (name-based, SHA-1) derivation from a namespace UUID and a name.
 * RFC 4122 §4.3 implementation. We do not pull in a runtime dep — Node's
 * built-in `crypto` is enough.
 */
function uuidv5(namespace: string, name: string): string {
  const nsBytes = uuidToBytes(namespace);
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1')
    .update(nsBytes)
    .update(nameBytes)
    .digest();

  // Take first 16 bytes
  const out = Buffer.from(hash.subarray(0, 16));
  // Set version (5) — high nibble of byte 6
  out[6] = (out[6]! & 0x0f) | 0x50;
  // Set variant (RFC 4122) — high two bits of byte 8
  out[8] = (out[8]! & 0x3f) | 0x80;
  return bytesToUuid(out);
}

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  return Buffer.from(hex, 'hex');
}

function bytesToUuid(buf: Buffer): string {
  const hex = buf.toString('hex');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20, 32)
  );
}

/**
 * Map a stable seed slug (e.g. `prop_cedar`) to a deterministic UUID.
 * Re-running the seed produces identical IDs, so `onConflictDoNothing()`
 * makes the seed idempotent.
 */
export function stableId(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error(`stableId: slug must be a non-empty string, got: ${String(slug)}`);
  }
  return uuidv5(SEED_NAMESPACE_UUID, slug);
}

/**
 * Deterministic SHA-256 of a UTF-8 string. Used to compute document version
 * checksums from a stable text payload (the seed never ships real PDFs).
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Build a `originals/<sha[0..2]>/<sha>` storage key from a SHA-256 hex digest.
 * Mirrors the layout the local FS storage adapter uses in dev.
 */
export function storageKeyFor(sha: string): string {
  return `originals/${sha.slice(0, 2)}/${sha}`;
}

/**
 * Convenience: anchor date for the Cedar Heights demo. The PRD's timeline is
 * relative to the fire (Day 0) which we anchor to today's date — but the
 * seed must be stable across runs, so we hard-code the anchor.
 */
export const FIRE_DAY = new Date('2026-05-09T00:00:00-04:00');

/**
 * Compute an absolute ISO timestamp `dayOffset` days from `FIRE_DAY` at the
 * given local time-of-day (24h `HH:mm[:ss]`, default `09:00:00`).
 */
export function dayOffset(
  days: number,
  timeOfDay = '09:00:00',
): Date {
  const d = new Date(FIRE_DAY);
  d.setUTCDate(d.getUTCDate() + days);
  const [hh, mm, ss] = timeOfDay.split(':').map((p) => parseInt(p, 10));
  // The FIRE_DAY anchor is stored at midnight EDT; treating offsets in UTC
  // is sufficient for stable, comparable timestamps in the seed.
  d.setUTCHours(hh ?? 9, mm ?? 0, ss ?? 0, 0);
  return d;
}

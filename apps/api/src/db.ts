/**
 * Process-wide Drizzle handle. The Fastify server initialises this once;
 * tests can swap it via `setDb`.
 */

import { createDb, type DbHandle } from '@fireproof/db';
import { getConfig } from './config.js';

let cached: DbHandle | undefined;

export function getDb(): DbHandle {
  if (!cached) {
    const cfg = getConfig();
    cached = createDb(cfg.databaseUrl);
  }
  return cached;
}

export function setDb(handle: DbHandle): void {
  cached = handle;
}

export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = undefined;
  }
}

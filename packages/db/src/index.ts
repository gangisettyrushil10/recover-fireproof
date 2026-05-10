/**
 * `@fireproof/db` — Drizzle ORM schema, types, and connection helpers.
 *
 * Usage:
 *   import { createDb } from '@fireproof/db';
 *   const db = createDb(process.env.DATABASE_URL!);
 *   const rows = await db.select().from(schema.organizations);
 */

import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

export * as schema from './schema/index.js';
export * from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
  /** Closes underlying pg pool — call on graceful shutdown. */
  close(): Promise<void>;
}

export interface CreateDbOptions {
  /** When true, throws on prepared-statement reuse mismatches. */
  strict?: boolean;
  /** Optional pre-configured pool — useful for tests. */
  pool?: pg.Pool;
  /** Maximum pool size. Default: 10. */
  max?: number;
}

/**
 * Build a typed Drizzle client backed by node-postgres.
 *
 * The returned handle owns its `pg.Pool`; callers must invoke `close()`
 * during shutdown unless they passed in their own pool.
 */
export function createDb(connectionString: string, options: CreateDbOptions = {}): DbHandle {
  const pool =
    options.pool ??
    new pg.Pool({
      connectionString,
      max: options.max ?? 10,
    });
  const db = drizzle(pool, { schema });
  const ownsPool = !options.pool;
  return {
    db,
    pool,
    async close(): Promise<void> {
      if (ownsPool) {
        await pool.end();
      }
    },
  };
}

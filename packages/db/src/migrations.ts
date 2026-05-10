/**
 * Migration runner. Reads the SQL files in `migrations/` (sorted by name)
 * and executes them against a connection. Tracks applied migrations in
 * `_fireproof_migrations`.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default location of the bundled SQL migrations. */
export const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

export interface MigrationRecord {
  name: string;
  applied_at: Date;
}

async function ensureTable(client: pg.PoolClient | pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _fireproof_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function listApplied(client: pg.PoolClient | pg.Client): Promise<Set<string>> {
  const res = await client.query<MigrationRecord>(
    'SELECT name FROM _fireproof_migrations ORDER BY name',
  );
  return new Set(res.rows.map((r) => r.name));
}

async function listAvailable(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries.filter((e) => e.endsWith('.sql')).sort();
}

/**
 * Apply every pending migration. Throws on failure.
 *
 * Each file runs in its own transaction. The transaction wraps the SQL +
 * the bookkeeping insert, so a partial migration cannot be marked applied.
 */
export async function runMigrations(
  pool: pg.Pool,
  options: { dir?: string; logger?: (msg: string) => void } = {},
): Promise<{ applied: string[]; alreadyApplied: string[] }> {
  const dir = options.dir ?? MIGRATIONS_DIR;
  const log = options.logger ?? (() => {});

  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await listApplied(client);
    const available = await listAvailable(dir);

    const newlyApplied: string[] = [];
    const alreadyApplied: string[] = [];

    for (const name of available) {
      if (applied.has(name)) {
        alreadyApplied.push(name);
        continue;
      }
      const sqlPath = path.join(dir, name);
      const sql = await fs.readFile(sqlPath, 'utf8');
      log(`applying migration: ${name}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _fireproof_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
          [name],
        );
        await client.query('COMMIT');
        newlyApplied.push(name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${name} failed: ${(err as Error).message}`, {
          cause: err,
        });
      }
    }

    return { applied: newlyApplied, alreadyApplied };
  } finally {
    client.release();
  }
}

/**
 * Run packages/db migrations against DATABASE_URL.
 *
 * Reads `packages/db/migrations/0000_initial.sql` (and any subsequent
 * `00*_*.sql` files) and applies them sequentially within a single connection.
 * Idempotent for the initial migration via IF NOT EXISTS guards.
 */

import 'dotenv/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getConfig } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const cfg = getConfig();
  // packages/db/migrations is two levels up from apps/api/src/scripts, then
  // back into the workspace root and over to packages/db/migrations.
  // Resolve robustly:
  const candidates = [
    path.resolve(__dirname, '../../../../packages/db/migrations'),
    path.resolve(process.cwd(), 'packages/db/migrations'),
    path.resolve(process.cwd(), '../../packages/db/migrations'),
  ];
  let migrationsDir: string | null = null;
  for (const c of candidates) {
    try {
      const stat = await fs.stat(c);
      if (stat.isDirectory()) {
        migrationsDir = c;
        break;
      }
    } catch {
      // try next
    }
  }
  if (!migrationsDir) {
    throw new Error(
      `Could not locate packages/db/migrations. Tried: ${candidates.join(', ')}`,
    );
  }

  const files = (await fs.readdir(migrationsDir))
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const client = new pg.Client({ connectionString: cfg.databaseUrl });
  await client.connect();
  try {
    for (const f of files) {
      const sql = await fs.readFile(path.join(migrationsDir, f), 'utf8');
      console.log(`> applying ${f} (${sql.length} bytes)`);
      await client.query(sql);
    }
    console.log('Migrations applied.');
  } finally {
    await client.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

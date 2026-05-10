/**
 * Cedar Heights seed entrypoint. Loads .env, opens a Drizzle handle, and
 * runs the orchestrator.
 *
 *   pnpm --filter @fireproof/seed seed              # idempotent insert
 *   pnpm --filter @fireproof/seed seed:reset        # truncate then insert
 *   pnpm --filter @fireproof/seed seed:post-fire    # also activate hold
 */

import 'dotenv/config';
import { createDb } from '@fireproof/db';
import { seedAll, type SeedOptions } from './seed-all.js';

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgres://fireproof:fireproof@localhost:5432/fireproof';
  const opts: SeedOptions = {
    reset: process.argv.includes('--reset'),
    postFire: process.argv.includes('--post-fire'),
  };
  const handle = createDb(databaseUrl);
  try {
    const result = await seedAll(handle.db, opts);
    console.log('seed complete:');
    for (const [k, v] of Object.entries(result.inserted)) {
      console.log(`  ${k.padEnd(28)} ${v}`);
    }
  } finally {
    await handle.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { seedAll };

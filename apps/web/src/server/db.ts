/**
 * Server-only singleton Drizzle handle. Reused across all /api/v1 route
 * handlers. On Vercel each cold-start instantiates one pool; warm
 * invocations reuse it.
 */

import 'server-only';
import { createDb, type DbHandle } from '@fireproof/db';

declare global {
  // eslint-disable-next-line no-var
  var __fireproofDb: DbHandle | undefined;
}

export function getDb(): DbHandle {
  if (!global.__fireproofDb) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. In Vercel, attach a Postgres database ' +
          '(Neon, Vercel Postgres) and bind DATABASE_URL.',
      );
    }
    global.__fireproofDb = createDb(url, { max: 5 });
  }
  return global.__fireproofDb;
}

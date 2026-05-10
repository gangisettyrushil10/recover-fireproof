/**
 * Drizzle Kit config — used to generate SQL migrations from the
 * TypeScript schema. The connection URL is taken from `DATABASE_URL`.
 */
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? 'postgres://fireproof:fireproof@localhost:5432/fireproof';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  strict: true,
  verbose: true,
  dbCredentials: { url },
});

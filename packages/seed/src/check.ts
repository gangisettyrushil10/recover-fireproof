/**
 * Verifies that the seed produced the expected Cedar Heights demo state.
 * Run after `pnpm --filter @fireproof/seed seed`.
 */

import 'dotenv/config';
import { createDb, schema } from '@fireproof/db';
import { eq } from 'drizzle-orm';
import { stableId } from './util.js';
import { EXCEPTION_SLUGS, PROPERTY_SLUGS } from './ids.js';

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgres://fireproof:fireproof@localhost:5432/fireproof';
  const handle = createDb(databaseUrl);
  let failed = 0;
  const ok = (label: string, condition: boolean, detail?: string): void => {
    if (condition) console.log(`OK   ${label}`);
    else {
      console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  };
  try {
    const orgs = await handle.db.select().from(schema.organizations);
    ok('6 organizations', orgs.length >= 6, `got ${orgs.length}`);

    const users = await handle.db.select().from(schema.users);
    ok('6+ users', users.length >= 6, `got ${users.length}`);

    const props = await handle.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, stableId(PROPERTY_SLUGS.cedar)));
    ok('Cedar Heights property exists', props.length === 1);

    const sysCount = await handle.db.select().from(schema.systems);
    ok('5 systems', sysCount.length === 5, `got ${sysCount.length}`);

    const excs = await handle.db.select().from(schema.exceptions);
    ok('5 exceptions', excs.length === 5, `got ${excs.length}`);

    const imp = excs.find((e) => e.id === stableId(EXCEPTION_SLUGS.imp0116));
    ok(
      'exc_imp_0116 in restored_evidence_incomplete',
      imp?.state === 'restored_evidence_incomplete',
      `state=${imp?.state}`,
    );

    const evidence = await handle.db.select().from(schema.evidence_items);
    const impEv = evidence.filter((e) => e.exception_id === stableId(EXCEPTION_SLUGS.imp0116));
    ok('impairment has evidence with insufficient/missing entries', impEv.some((e) => e.status !== 'valid'));

    const contradictions = await handle.db.select().from(schema.contradictions);
    ok('4+ contradictions seeded', contradictions.length >= 4, `got ${contradictions.length}`);

    const docs = await handle.db.select().from(schema.documents);
    ok('13 documents', docs.length === 13, `got ${docs.length}`);

    const versions = await handle.db.select().from(schema.document_versions);
    ok('13 originals', versions.filter((v) => v.is_original).length === 13, `got ${versions.filter((v) => v.is_original).length}`);

    if (failed > 0) {
      console.log(`\n${failed} check(s) failed.`);
      process.exit(1);
    } else {
      console.log('\nAll checks passed.');
    }
  } finally {
    await handle.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

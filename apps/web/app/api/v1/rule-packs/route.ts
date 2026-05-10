import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { schema } from '@fireproof/db';
import { getDb } from '@/server/db';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const { db } = getDb();
    const items = await db
      .select()
      .from(schema.rule_packs)
      .where(eq(schema.rule_packs.organization_id, ctx.organization_id))
      .orderBy(desc(schema.rule_packs.created_at));
    return ok({ items });
  } catch (e) {
    return err(e);
  }
}

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
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
      .from(schema.properties)
      .where(eq(schema.properties.organization_id, ctx.organization_id))
      .orderBy(schema.properties.name);
    return ok({ items });
  } catch (e) {
    return err(e);
  }
}

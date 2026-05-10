import { NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@fireproof/db';
import { getDb } from '@/server/db';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  try {
    const ctx = await requireAuth(req);
    const { propertyId } = await params;
    const { db } = getDb();
    const items = await db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.organization_id, ctx.organization_id),
          eq(schema.documents.property_id, propertyId),
        ),
      )
      .orderBy(desc(schema.documents.created_at));
    return ok({ items });
  } catch (e) {
    return err(e);
  }
}

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@fireproof/db';
import { getDb } from '@/server/db';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth(req);
    const { id } = await params;
    const svc = getServices();
    const ex = await svc.exceptions.get(ctx.organization_id, id);
    const { db } = getDb();
    const evidence = await db
      .select()
      .from(schema.evidence_items)
      .where(eq(schema.evidence_items.exception_id, ex.id))
      .orderBy(schema.evidence_items.evidence_type);
    const latest_evaluation =
      (await svc.rules.getLatest(ctx.organization_id, ex.id)) ?? null;
    return ok({ exception: ex, evidence, latest_evaluation });
  } catch (e) {
    return err(e);
  }
}

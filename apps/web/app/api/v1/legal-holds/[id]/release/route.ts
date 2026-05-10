import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Body = z.object({ reason: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth(req);
    const { id } = await params;
    const body = Body.parse(await req.json());
    const hold = await getServices().legalHolds.release(
      id,
      ctx.organization_id,
      ctx.user_id,
      body.reason,
    );
    return ok(hold);
  } catch (e) {
    return err(e);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Body = z.object({
  to_state: z.string().min(1),
  reason: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth(req);
    const { id } = await params;
    const body = Body.parse(await req.json());
    const updated = await getServices().exceptions.transition({
      organization_id: ctx.organization_id,
      exception_id: id,
      to_state: body.to_state,
      reason: body.reason ?? null,
      actor_user_id: ctx.user_id,
    });
    return ok(updated);
  } catch (e) {
    return err(e);
  }
}

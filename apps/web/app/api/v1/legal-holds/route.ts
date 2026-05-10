import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Body = z.object({
  scope_type: z.enum([
    'property',
    'exception',
    'packet',
    'document',
    'document_version',
  ]),
  scope_id: z.string().uuid(),
  reason: z.string().min(1),
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const url = new URL(req.url);
    const items = await getServices().legalHolds.list(ctx.organization_id, {
      scope_type: url.searchParams.get('scope_type') ?? undefined,
      scope_id: url.searchParams.get('scope_id') ?? undefined,
    });
    return ok({
      items,
      pagination: { total: items.length, limit: items.length, offset: 0 },
    });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const body = Body.parse(await req.json());
    const hold = await getServices().legalHolds.create({
      organization_id: ctx.organization_id,
      scope_type: body.scope_type,
      scope_id: body.scope_id,
      reason: body.reason,
      requested_by_user_id: ctx.user_id,
      name: body.name,
      metadata: body.metadata,
    });
    return ok(hold, 201);
  } catch (e) {
    return err(e);
  }
}

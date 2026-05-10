import { NextRequest } from 'next/server';
import { z } from 'zod';
import { PacketTypeValues, type PacketType } from '@fireproof/domain';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Query = z.object({ property_id: z.string().uuid().optional() });

const Body = z.object({
  property_id: z.string().uuid().nullable().optional(),
  exception_id: z.string().uuid().nullable().optional(),
  packet_type: z.enum(PacketTypeValues),
  title: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const url = new URL(req.url);
    const q = Query.parse(Object.fromEntries(url.searchParams));
    const items = await getServices().packets.list(ctx.organization_id, q);
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
    const created = await getServices().packets.create({
      organization_id: ctx.organization_id,
      property_id: body.property_id ?? null,
      exception_id: body.exception_id ?? null,
      packet_type: body.packet_type as PacketType,
      title: body.title,
      generated_by_user_id: ctx.user_id,
      generated_by_role: ctx.role,
    });
    return ok(created, 201);
  } catch (e) {
    return err(e);
  }
}

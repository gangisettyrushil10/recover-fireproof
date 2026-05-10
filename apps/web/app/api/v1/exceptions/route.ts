import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  ExceptionTypeValues,
  SeverityValues,
  type ExceptionType,
  type Severity,
} from '@fireproof/domain';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Query = z.object({
  property_id: z.string().uuid().optional(),
  type: z.enum(ExceptionTypeValues).optional(),
  severity: z.enum(SeverityValues).optional(),
  open_only: z.coerce.boolean().optional(),
});

const Create = z.object({
  property_id: z.string().uuid(),
  type: z.enum(ExceptionTypeValues),
  title: z.string().min(1),
  severity: z.enum(SeverityValues),
  system_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
  jurisdiction_id: z.string().uuid().nullable().optional(),
  rule_pack_id: z.string().uuid().nullable().optional(),
  summary: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const url = new URL(req.url);
    const q = Query.parse(Object.fromEntries(url.searchParams));
    const items = await getServices().exceptions.listAll(ctx.organization_id, q);
    return ok({
      items: q.open_only ? items.filter((e) => !e.closed_at) : items,
      pagination: { total: items.length, limit: items.length, offset: 0 },
    });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const body = Create.parse(await req.json());
    const created = await getServices().exceptions.create({
      organization_id: ctx.organization_id,
      property_id: body.property_id,
      type: body.type as ExceptionType,
      title: body.title,
      severity: body.severity as Severity,
      system_id: body.system_id ?? null,
      asset_id: body.asset_id ?? null,
      jurisdiction_id: body.jurisdiction_id ?? null,
      rule_pack_id: body.rule_pack_id ?? null,
      summary: body.summary ?? null,
      reporter_user_id: ctx.user_id,
      metadata: body.metadata ?? {},
    });
    return ok(created, 201);
  } catch (e) {
    return err(e);
  }
}

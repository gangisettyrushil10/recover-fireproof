import { NextRequest } from 'next/server';
import { getServices } from '@/server/services';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  try {
    const ctx = await requireAuth(req);
    const { propertyId } = await params;
    const dash = await getServices().dashboard.load(ctx.organization_id, propertyId);
    return ok(dash);
  } catch (e) {
    return err(e);
  }
}

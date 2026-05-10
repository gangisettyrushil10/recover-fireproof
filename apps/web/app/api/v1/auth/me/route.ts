import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@fireproof/db';
import { notFound } from '@fireproof/domain';
import { getDb } from '@/server/db';
import { requireAuth } from '@/server/auth';
import { err, ok } from '@/server/handler';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const { db } = getDb();
    const rows = await db
      .select({ user: schema.users, org: schema.organizations })
      .from(schema.users)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.users.organization_id),
      )
      .where(eq(schema.users.id, ctx.user_id))
      .limit(1);
    const found = rows[0];
    if (!found) throw notFound('user', ctx.user_id);
    return ok({
      user: {
        id: found.user.id,
        email: found.user.email,
        name: found.user.full_name,
        role: found.user.role,
        organization_id: found.org.id,
        organization_name: found.org.name,
      },
    });
  } catch (e) {
    return err(e);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { schema } from '@fireproof/db';
import { notFound } from '@fireproof/domain';
import { getDb } from '@/server/db';
import { signDevToken } from '@/server/auth';
import { err, ok } from '@/server/handler';

const Body = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const { db } = getDb();
    const body = Body.parse(await req.json());
    const rows = await db
      .select({ user: schema.users, org: schema.organizations })
      .from(schema.users)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.users.organization_id),
      )
      .where(eq(schema.users.email, body.email))
      .limit(1);
    const found = rows[0];
    if (!found) throw notFound('user', body.email);
    const token = await signDevToken({
      user_id: found.user.id,
      organization_id: found.org.id,
      role: found.user.role as never,
    });
    return ok({
      token,
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

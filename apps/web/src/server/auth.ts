/**
 * JWT helpers for the Next.js route handlers. Mirrors the contract in
 * `apps/api/src/auth.ts` so the same `dev-login` token works for both
 * the standalone API and the Vercel-hosted handlers.
 */

import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import { DomainError, DomainErrorCode } from '@fireproof/domain';
import type { UserRole } from '@fireproof/domain';

const ALG = 'HS256';

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET ?? 'dev-only-jwt-secret-change-me';
  return new TextEncoder().encode(s);
}

export interface AuthPrincipal {
  user_id: string;
  organization_id: string;
  role: UserRole;
}

export async function signDevToken(p: AuthPrincipal): Promise<string> {
  return await new SignJWT({
    user_id: p.user_id,
    organization_id: p.organization_id,
    role: p.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}

export async function requireAuth(req: Request): Promise<AuthPrincipal> {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    throw new DomainError(DomainErrorCode.Forbidden, 'Authentication required');
  }
  const token = auth.slice('bearer '.length).trim();
  if (!token) {
    throw new DomainError(DomainErrorCode.Forbidden, 'Authentication required');
  }
  const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
  if (
    typeof payload.user_id !== 'string' ||
    typeof payload.organization_id !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new DomainError(
      DomainErrorCode.Forbidden,
      'JWT missing required claims',
    );
  }
  return {
    user_id: payload.user_id,
    organization_id: payload.organization_id,
    role: payload.role as UserRole,
  };
}

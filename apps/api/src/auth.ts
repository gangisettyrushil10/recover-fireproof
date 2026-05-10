/**
 * MVP auth: HS256 JWT plus a dev-only `x-fireproof-user` header that
 * looks up a seeded user by id (skips signature verification entirely).
 *
 * RBAC is enforced at the route level via `requireRole(...roles)`.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify, SignJWT } from 'jose';
import type { UserRole } from '@fireproof/domain/enums';
import { DomainError, DomainErrorCode } from '@fireproof/domain/errors';
import { getConfig } from './config.js';

export interface AuthPrincipal {
  user_id: string;
  organization_id: string;
  role: UserRole;
  /** True if loaded via the dev header rather than a signed JWT. */
  dev_unsigned?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthPrincipal;
  }
}

const ALG = 'HS256';

export async function signDevToken(payload: AuthPrincipal): Promise<string> {
  const { jwtSecret } = getConfig();
  const secret = new TextEncoder().encode(jwtSecret);
  return await new SignJWT({
    user_id: payload.user_id,
    organization_id: payload.organization_id,
    role: payload.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
}

async function verifyToken(token: string): Promise<AuthPrincipal> {
  const { jwtSecret } = getConfig();
  const secret = new TextEncoder().encode(jwtSecret);
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
  if (
    typeof payload.user_id !== 'string' ||
    typeof payload.organization_id !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new DomainError(
      DomainErrorCode.Forbidden,
      'JWT missing required claims (user_id/organization_id/role)',
    );
  }
  return {
    user_id: payload.user_id,
    organization_id: payload.organization_id,
    role: payload.role as UserRole,
  };
}

/**
 * Fastify preHandler. Resolves `request.auth` from the bearer JWT or, in
 * non-production, from the `x-fireproof-user` header.
 *
 * The dev header is optional — routes that mark themselves as public can
 * still bypass it; protected routes call `requireAuth`/`requireRole`.
 */
export async function authenticate(req: FastifyRequest): Promise<void> {
  if (req.auth) return;
  const auth = req.headers.authorization;
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice('bearer '.length).trim();
    if (token) {
      req.auth = await verifyToken(token);
      return;
    }
  }

  const cfg = getConfig();
  if (cfg.nodeEnv !== 'production') {
    const devUser = req.headers['x-fireproof-user'];
    const devOrg = req.headers['x-fireproof-organization'];
    const devRole = req.headers['x-fireproof-role'];
    if (typeof devUser === 'string' && typeof devOrg === 'string') {
      req.auth = {
        user_id: devUser,
        organization_id: devOrg,
        role: (typeof devRole === 'string' ? (devRole as UserRole) : 'admin'),
        dev_unsigned: true,
      };
    }
  }
}

export function requireAuth(req: FastifyRequest, reply: FastifyReply): AuthPrincipal {
  if (!req.auth) {
    void reply.code(401).send({
      code: DomainErrorCode.Forbidden,
      message: 'Authentication required',
      details: {},
    });
    throw new DomainError(DomainErrorCode.Forbidden, 'Authentication required');
  }
  return req.auth;
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const p = requireAuth(req, reply);
    if (roles.length > 0 && !roles.includes(p.role)) {
      throw new DomainError(
        DomainErrorCode.Forbidden,
        `Role ${p.role} not in allowed: ${roles.join(',')}`,
        { details: { required: roles } },
      );
    }
  };
}

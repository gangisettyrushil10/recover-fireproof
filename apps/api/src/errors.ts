/**
 * HTTP mapping for `DomainError` plus a small helper for non-domain errors
 * that need to surface as a typed envelope.
 */

import type { FastifyReply } from 'fastify';
import { DomainError, DomainErrorCode } from '@fireproof/domain/errors';

export const HTTP_BY_CODE: Record<DomainErrorCode, number> = {
  [DomainErrorCode.BlockingRequirementsUnmet]: 422,
  [DomainErrorCode.InvalidStateTransition]: 409,
  [DomainErrorCode.LegalHoldActive]: 423,
  [DomainErrorCode.ValidationFailed]: 400,
  [DomainErrorCode.NotFound]: 404,
  [DomainErrorCode.Forbidden]: 403,
  [DomainErrorCode.UnspecifiedRule]: 422,
};

export function statusForDomainError(err: DomainError): number {
  return HTTP_BY_CODE[err.code] ?? 500;
}

export function sendDomainError(reply: FastifyReply, err: DomainError): FastifyReply {
  const status = statusForDomainError(err);
  return reply.code(status).send({
    code: err.code,
    message: err.message,
    details: err.details,
    occurred_at: new Date().toISOString(),
    request_id: reply.request.id,
  });
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

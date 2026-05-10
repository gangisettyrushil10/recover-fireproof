/**
 * Shared response + error mapping for the /api/v1 route handlers.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const HTTP_BY_CODE: Record<string, number> = {
  BLOCKING_REQUIREMENTS_UNMET: 422,
  INVALID_STATE_TRANSITION: 409,
  LEGAL_HOLD_ACTIVE: 423,
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNSPECIFIED_RULE: 422,
};

// Duck-type check: route handlers and the service layer can load distinct
// module instances of `DomainError` (src vs built dist), so `instanceof`
// is unreliable across that seam. Accept any thrown error whose `code` is
// one of the known domain codes.
function isDomainError(
  e: unknown,
): e is { code: string; message: string; details?: Record<string, unknown> } {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { code?: unknown }).code === 'string' &&
    (e as { code: string }).code in HTTP_BY_CODE
  );
}

export function err(e: unknown): NextResponse {
  if (isDomainError(e)) {
    const status = HTTP_BY_CODE[e.code] ?? 500;
    return NextResponse.json(
      { code: e.code, message: e.message, details: e.details ?? {} },
      { status },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { issues: e.issues },
      },
      { status: 400 },
    );
  }
  // eslint-disable-next-line no-console
  console.error('[/api/v1] unhandled', e);
  return NextResponse.json(
    {
      code: 'INTERNAL_ERROR',
      message: e instanceof Error ? e.message : 'Internal server error',
      details: {},
    },
    { status: 500 },
  );
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as unknown, { status });
}

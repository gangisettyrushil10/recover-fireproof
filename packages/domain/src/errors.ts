/**
 * Domain-level error codes and the `DomainError` class.
 *
 * Throw `DomainError` from any package; the API layer maps codes to HTTP
 * status codes (e.g., NOT_FOUND → 404, FORBIDDEN → 403, the rest → 4xx).
 */

export const DomainErrorCodeValues = [
  'BLOCKING_REQUIREMENTS_UNMET',
  'INVALID_STATE_TRANSITION',
  'LEGAL_HOLD_ACTIVE',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'FORBIDDEN',
  'UNSPECIFIED_RULE',
] as const;

export type DomainErrorCode = (typeof DomainErrorCodeValues)[number];

export const DomainErrorCode = {
  BlockingRequirementsUnmet: 'BLOCKING_REQUIREMENTS_UNMET',
  InvalidStateTransition: 'INVALID_STATE_TRANSITION',
  LegalHoldActive: 'LEGAL_HOLD_ACTIVE',
  ValidationFailed: 'VALIDATION_FAILED',
  NotFound: 'NOT_FOUND',
  Forbidden: 'FORBIDDEN',
  UnspecifiedRule: 'UNSPECIFIED_RULE',
} as const satisfies Record<string, DomainErrorCode>;

export interface DomainErrorOptions {
  /** Free-form structured context — e.g., the offending state pair, or
   * the list of unmet blocking requirement IDs. Safe to surface to API
   * clients (do not put secrets here). */
  details?: Record<string, unknown>;
  /** Optional underlying error for chaining (`{ cause }`). */
  cause?: unknown;
}

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, options: DomainErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'DomainError';
    this.code = code;
    this.details = options.details ?? {};
    // Preserve prototype chain across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** JSON wire shape for the API error responder. */
  toJSON(): { code: DomainErrorCode; message: string; details: Record<string, unknown> } {
    return { code: this.code, message: this.message, details: this.details };
  }

  static is(value: unknown): value is DomainError {
    return value instanceof DomainError;
  }
}

// ─── Constructors for the most common cases (ergonomic shortcuts) ───────────

export const blockingRequirementsUnmet = (
  unmet: string[],
  details?: Record<string, unknown>,
): DomainError =>
  new DomainError(
    DomainErrorCode.BlockingRequirementsUnmet,
    `Cannot transition: ${unmet.length} blocking requirement(s) unmet.`,
    { details: { unmet, ...details } },
  );

export const invalidStateTransition = (
  type: string,
  from: string,
  to: string,
): DomainError =>
  new DomainError(
    DomainErrorCode.InvalidStateTransition,
    `Transition not allowed for ${type}: ${from} → ${to}.`,
    { details: { type, from, to } },
  );

export const legalHoldActive = (
  subjectKind: 'document' | 'exception' | 'evidence_item',
  subjectId: string,
): DomainError =>
  new DomainError(
    DomainErrorCode.LegalHoldActive,
    `Operation blocked: ${subjectKind} ${subjectId} is under an active legal hold.`,
    { details: { subjectKind, subjectId } },
  );

export const validationFailed = (
  message: string,
  details?: Record<string, unknown>,
): DomainError =>
  new DomainError(DomainErrorCode.ValidationFailed, message, { details });

export const notFound = (resource: string, id: string): DomainError =>
  new DomainError(DomainErrorCode.NotFound, `${resource} not found: ${id}`, {
    details: { resource, id },
  });

export const forbidden = (reason: string, details?: Record<string, unknown>): DomainError =>
  new DomainError(DomainErrorCode.Forbidden, reason, { details });

export const unspecifiedRule = (
  ruleKey: string,
  details?: Record<string, unknown>,
): DomainError =>
  new DomainError(
    DomainErrorCode.UnspecifiedRule,
    `Rule pack does not define a requirement for: ${ruleKey}`,
    { details: { ruleKey, ...details } },
  );

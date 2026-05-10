/**
 * Per-evidence-type validators. Each takes the evidence-item payload (the
 * `payload` JSON column) and returns either a `valid` outcome or a list of
 * structured errors. The service downgrades the evidence_item.status to
 * `insufficient` when errors are surfaced.
 */

import type { EvidenceType } from '@fireproof/domain';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationOutcome {
  valid: boolean;
  errors: ValidationError[];
}

export const ok: ValidationOutcome = { valid: true, errors: [] };
export const bad = (...errors: ValidationError[]): ValidationOutcome => ({
  valid: false,
  errors,
});

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// ─── notification_proof ─────────────────────────────────────────────────────

export function validateNotificationProof(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.recipient_role))
    errs.push({ field: 'recipient_role', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.channel))
    errs.push({ field: 'channel', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.timestamp))
    errs.push({ field: 'timestamp', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.outcome))
    errs.push({ field: 'outcome', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.actor))
    errs.push({ field: 'actor', message: 'required', code: 'REQUIRED' });
  return errs.length ? bad(...errs) : ok;
}

// ─── fire_watch_record ──────────────────────────────────────────────────────

export function validateFireWatchRecord(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.person))
    errs.push({ field: 'person', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.start))
    errs.push({ field: 'start', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.end))
    errs.push({ field: 'end', message: 'required', code: 'REQUIRED' });
  if (
    isNonEmptyString(payload.start) &&
    isNonEmptyString(payload.end) &&
    !(new Date(payload.end as string) > new Date(payload.start as string))
  ) {
    errs.push({ field: 'end', message: 'end must be after start', code: 'TIME_ORDER' });
  }
  const provider = isNonEmptyString(payload.provider) ? payload.provider : null;
  const isExternal = provider !== null && provider !== 'internal';
  if (isExternal && !isNonEmptyString(payload.vendor_reference)) {
    errs.push({
      field: 'vendor_reference',
      message: 'required when provider is external',
      code: 'REQUIRED',
    });
  }
  return errs.length ? bad(...errs) : ok;
}

// ─── restoration_test_record ────────────────────────────────────────────────

/**
 * The Cedar Heights wedge: we explicitly reject pure free-text "pressure good"
 * notes. `readings` must be an object whose values are numbers.
 */
export function validateRestorationTestRecord(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.test_type))
    errs.push({ field: 'test_type', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.performedBy))
    errs.push({ field: 'performedBy', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.performedAt))
    errs.push({ field: 'performedAt', message: 'required', code: 'REQUIRED' });
  const readings = payload.readings;
  if (!isObject(readings) || Object.keys(readings).length === 0) {
    errs.push({
      field: 'readings',
      message: 'free text alone is insufficient — numeric readings required',
      code: 'NUMERIC_REQUIRED',
    });
  } else {
    let numericCount = 0;
    for (const v of Object.values(readings)) {
      if (typeof v === 'number' && Number.isFinite(v)) numericCount += 1;
    }
    if (numericCount === 0) {
      errs.push({
        field: 'readings',
        message: 'free text alone is insufficient — numeric readings required',
        code: 'NUMERIC_REQUIRED',
      });
    }
  }
  return errs.length ? bad(...errs) : ok;
}

// ─── customer_decision ──────────────────────────────────────────────────────

export function validateCustomerDecision(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  const allowed = new Set(['approved', 'declined', 'no_response']);
  if (!isNonEmptyString(payload.outcome) || !allowed.has(payload.outcome as string)) {
    errs.push({
      field: 'outcome',
      message: 'must be one of approved | declined | no_response',
      code: 'INVALID_VALUE',
    });
  }
  if (
    payload.outcome === 'declined' &&
    !isNonEmptyString(payload.signed_proof_document_version_id)
  ) {
    errs.push({
      field: 'signed_proof_document_version_id',
      message: 'required when outcome=declined',
      code: 'REQUIRED',
    });
  }
  return errs.length ? bad(...errs) : ok;
}

// ─── proposal_transmission_proof ────────────────────────────────────────────

export function validateProposalTransmissionProof(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.sentAt))
    errs.push({ field: 'sentAt', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.recipient))
    errs.push({ field: 'recipient', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.channel))
    errs.push({ field: 'channel', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.proposalId))
    errs.push({ field: 'proposalId', message: 'required', code: 'REQUIRED' });
  return errs.length ? bad(...errs) : ok;
}

// ─── asset_identity_proof ───────────────────────────────────────────────────

export function validateAssetIdentityProof(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.manufacturer))
    errs.push({ field: 'manufacturer', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.model))
    errs.push({ field: 'model', message: 'required', code: 'REQUIRED' });
  const photos = payload.photo_evidence_refs;
  if (!Array.isArray(photos) || photos.length === 0) {
    errs.push({
      field: 'photo_evidence_refs',
      message: 'at least one photo evidence ref required',
      code: 'REQUIRED',
    });
  }
  return errs.length ? bad(...errs) : ok;
}

// ─── photo_evidence ─────────────────────────────────────────────────────────

export function validatePhotoEvidence(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.capturedAtClient))
    errs.push({ field: 'capturedAtClient', message: 'required', code: 'REQUIRED' });
  if (!isNonEmptyString(payload.uploader))
    errs.push({ field: 'uploader', message: 'required', code: 'REQUIRED' });
  if (!isObject(payload.linked_entity)) {
    errs.push({
      field: 'linked_entity',
      message: 'linked entity ref required',
      code: 'REQUIRED',
    });
  }
  return errs.length ? bad(...errs) : ok;
}

// ─── original_source_document ───────────────────────────────────────────────

export function validateOriginalSourceDocument(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.document_version_id))
    errs.push({ field: 'document_version_id', message: 'required', code: 'REQUIRED' });
  if (payload.is_original !== true)
    errs.push({
      field: 'is_original',
      message: 'must reference a document_version with is_original=true',
      code: 'NOT_ORIGINAL',
    });
  return errs.length ? bad(...errs) : ok;
}

// ─── counsel_hold_notice ────────────────────────────────────────────────────

export function validateCounselHoldNotice(payload: unknown): ValidationOutcome {
  if (!isObject(payload)) return bad({ field: '', message: 'payload required', code: 'EMPTY' });
  const errs: ValidationError[] = [];
  if (!isNonEmptyString(payload.legal_hold_id))
    errs.push({ field: 'legal_hold_id', message: 'required', code: 'REQUIRED' });
  return errs.length ? bad(...errs) : ok;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export function validateByType(
  evidence_type: EvidenceType,
  payload: unknown,
): ValidationOutcome {
  switch (evidence_type) {
    case 'notification_proof':
      return validateNotificationProof(payload);
    case 'fire_watch_record':
      return validateFireWatchRecord(payload);
    case 'restoration_test_record':
      return validateRestorationTestRecord(payload);
    case 'customer_decision':
      return validateCustomerDecision(payload);
    case 'proposal_transmission_proof':
      return validateProposalTransmissionProof(payload);
    case 'asset_identity_proof':
      return validateAssetIdentityProof(payload);
    case 'photo_evidence':
      return validatePhotoEvidence(payload);
    case 'original_source_document':
      return validateOriginalSourceDocument(payload);
    case 'counsel_hold_notice':
      return validateCounselHoldNotice(payload);
    default: {
      const _exhaustive: never = evidence_type;
      return bad({
        field: '',
        message: `no validator for ${String(_exhaustive)}`,
        code: 'NO_VALIDATOR',
      });
    }
  }
}

/**
 * Internal types for the legal-export library.
 *
 * The library operates on plain structured records — never DB rows or HTTP
 * responses. Backend code adapts its data into these shapes before calling.
 *
 * Where possible, types reference `@fireproof/domain` so we share enums and
 * branded ids with the rest of the system.
 */

import type {
  AssetId,
  AssetIdentityState,
  CarrierRecommendationState,
  Confidence,
  ContradictionId,
  ContradictionType,
  DeficiencyState,
  DocumentClaim,
  DocumentClaimId,
  DocumentId,
  DocumentSourceType,
  DocumentVersionId,
  EntityRef,
  EvidenceItem,
  EvidenceItemId,
  ExceptionId,
  ExceptionType,
  HoldStatus,
  ImpairmentState,
  IsoDateTime,
  LegalHold,
  OrganizationId,
  PacketId,
  PacketType,
  PropertyId,
  Severity,
  Sha256,
  TimeRange,
  UserId,
  UserRole,
} from '@fireproof/domain/types';

// ─────────────────────────────────────────────────────────────────────────────
// Library-internal claim representation.
//
// The `document_claims` table uses a generic JSON `claim_value`. The legal
// library reads/writes claims in a normalized "kind+value" shape so that the
// contradiction engine can compare claims across documents without each
// caller having to redesign payload encodings.
//
// Convention: when the lib emits or consumes a domain DocumentClaim, the
// `claim_value` JSON is `{ kind: <LegalClaimKind>, value: <JSON> }`. The
// extractors return a `LegalClaim` that the backend then writes to the DB.
// ─────────────────────────────────────────────────────────────────────────────

export const LegalClaimKindValues = [
  'system_status',
  'deficiency_exists',
  'notification_sent',
  'main_drain_performed',
  'main_drain_values',
  'pump_variance_pct',
  'duration_minutes',
  'manufacturer',
  'model',
  'serial_number',
  'customer_decision_status',
] as const;

export type LegalClaimKind = (typeof LegalClaimKindValues)[number];

/**
 * Concrete claim payload value. Strings, booleans, and numbers cover every
 * Cedar Heights case; structured payloads use `details` if needed.
 */
export type LegalClaimValue =
  | { kind: 'system_status'; value: 'satisfactory' | 'unsatisfactory' | 'deficient' | 'unknown' }
  | { kind: 'deficiency_exists'; value: boolean }
  | { kind: 'notification_sent'; value: 'sent' | 'not_sent' | 'unknown' }
  | { kind: 'main_drain_performed'; value: boolean }
  | { kind: 'main_drain_values'; value: { static_psi?: number; residual_psi?: number; readings_present: boolean } }
  | { kind: 'pump_variance_pct'; value: number }
  | { kind: 'duration_minutes'; value: number }
  | { kind: 'manufacturer'; value: string }
  | { kind: 'model'; value: string }
  | { kind: 'serial_number'; value: string }
  | { kind: 'customer_decision_status'; value: 'approved' | 'declined' | 'no_response' | 'pending' };

/**
 * Library-internal claim shape used by extractors and the contradiction
 * engine. Field names mirror the spec from the PRD and the agent prompt
 * exactly — the backend does any DB rewriting.
 */
export interface LegalClaim {
  /** A library-stable id; the backend may assign a real DocumentClaimId. */
  id: string;
  /** Discriminant — what kind of fact this claim asserts. */
  claim_type: LegalClaimKind;
  /** What the claim is about. */
  claim_subject_ref: EntityRef;
  /** Structured payload (matches `claim_type`). */
  claim_value: LegalClaimValue;
  /** Optional time window the claim covers. */
  claim_time_range?: TimeRange | null;
  /** Source document version (if extracted from one). */
  source_version_id?: DocumentVersionId | null;
  /** Confidence in [0,1] — extractors default to 1 (deterministic). */
  confidence?: Confidence;
  /** Provenance (e.g., extractor name, page). */
  provenance?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inputs to the extractors
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractorExceptionInput {
  id: ExceptionId;
  type: ExceptionType;
  property_id: PropertyId;
  system_id?: string | null;
  asset_id?: AssetId | null;
  state: ImpairmentState | DeficiencyState | CarrierRecommendationState | AssetIdentityState;
  severity: Severity;
  opened_at: IsoDateTime;
  closed_at?: IsoDateTime | null;
  metadata?: Record<string, unknown>;
}

export interface ExtractorEvidenceInput extends EvidenceItem {
  /** Optional structured payload pulled from the evidence form (e.g. main drain readings). */
  payload?: Record<string, unknown>;
}

export interface ExtractorAssetInput {
  id: AssetId;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  /** Source document the identity was read from, if any. */
  source_version_id?: DocumentVersionId | null;
}

export interface ExtractorInspectionReportInput {
  document_version_id: DocumentVersionId;
  property_id: PropertyId;
  /** Per system_id: status during the report window. */
  system_findings: Array<{
    system_id: string;
    status: 'satisfactory' | 'unsatisfactory' | 'deficient' | 'unknown';
    deficiency_noted: boolean;
  }>;
  /** Window the report covers. */
  period: TimeRange;
}

export interface ExtractorInternalNoteInput {
  document_version_id: DocumentVersionId;
  /** Subject the note discusses (typically a system or asset). */
  subject_ref: EntityRef;
  /** Whether the note acknowledges a deficiency. */
  deficiency_flagged: boolean;
  /** When the note was written. */
  noted_at: IsoDateTime;
  /** Window the deficiency was believed to apply to. */
  applies_to?: TimeRange | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contradictions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Library-internal contradiction-type enum. Extends/overlaps the domain
 * `ContradictionType` — the API maps each library type to its closest
 * domain type when persisting.
 */
export const LegalContradictionTypeValues = [
  'report_vs_internal_note',
  'omitted_known_deficiency',
  'timing_threshold_breach',
  'missing_corroboration',
  'asset_identity_mismatch',
  'performance_variance',
] as const;
export type LegalContradictionType = (typeof LegalContradictionTypeValues)[number];

/** Mapping from library contradiction type → closest domain type. */
export const LegalToDomainContradictionType: Record<LegalContradictionType, ContradictionType> = {
  report_vs_internal_note: 'time_overlap_disagreement',
  omitted_known_deficiency: 'time_overlap_disagreement',
  timing_threshold_breach: 'notification_proof_missing_or_late',
  missing_corroboration: 'restoration_test_disagreement',
  asset_identity_mismatch: 'identity_attribute_mismatch',
  performance_variance: 'restoration_test_disagreement',
};

export interface DetectedContradiction {
  id: string;
  type: LegalContradictionType;
  severity: Severity;
  /** Confidence in [0,1]. */
  confidence: number;
  /** First claim id (most upstream / "official"). */
  claim_a_id: string;
  /** Second claim id; may equal claim_a_id when a single claim is self-incomplete. */
  claim_b_id: string;
  explanation: string;
  suggested_resolution: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Packet manifest
// ─────────────────────────────────────────────────────────────────────────────

export const PACKET_MANIFEST_SCHEMA_VERSION = '1.0' as const;

export interface PacketManifestExceptionSummary {
  exception_id: ExceptionId;
  type: ExceptionType;
  state: string;
  severity: Severity;
  opened_at: IsoDateTime;
  closed_at: IsoDateTime | null;
  title: string;
}

export interface PacketManifestContradictionSummary {
  id: string;
  type: LegalContradictionType;
  severity: Severity;
  confidence: number;
}

export interface PacketManifestDocument {
  document_version_id: DocumentVersionId;
  document_id: DocumentId;
  version_no: number;
  sha256: Sha256;
  mime_type: string;
  byte_size: number;
  is_original: boolean;
  hold_status: HoldStatus;
  included_as: 'original' | 'derivative' | 'manifest' | 'narrative';
  order_index: number;
  source_type: DocumentSourceType;
  title: string;
  /** ISO-8601 date the document was authored / received (used in stable ordering). */
  document_date?: IsoDateTime | null;
}

export interface PacketManifestTotals {
  documents: number;
  originals: number;
  derivatives: number;
  byte_size_total: number;
}

export interface PacketManifestActor {
  user_id: UserId;
  role: UserRole;
  organization_id: OrganizationId;
}

export interface PacketManifest {
  packet_id: PacketId;
  packet_type: PacketType;
  property_id: PropertyId;
  generated_at: IsoDateTime;
  generated_by: PacketManifestActor;
  legal_hold_active: boolean;
  exception_summary: PacketManifestExceptionSummary[];
  contradictions_summary: PacketManifestContradictionSummary[];
  documents: PacketManifestDocument[];
  totals: PacketManifestTotals;
  schema_version: typeof PACKET_MANIFEST_SCHEMA_VERSION;
}

// ─────────────────────────────────────────────────────────────────────────────
// Packet builder I/O
// ─────────────────────────────────────────────────────────────────────────────

export interface PacketDocumentInput extends Omit<PacketManifestDocument, 'order_index' | 'included_as'> {
  storage_key: string;
  /** Optional override; otherwise derived from is_original. */
  included_as?: PacketManifestDocument['included_as'];
}

export interface PacketAuditInput {
  events: unknown[];
}

export interface PacketInput {
  packet_id: PacketId;
  packet_type: PacketType;
  property_id: PropertyId;
  generated_at: IsoDateTime;
  generated_by: PacketManifestActor;
  legal_hold_active: boolean;
  exceptions: PacketManifestExceptionSummary[];
  contradictions: PacketManifestContradictionSummary[];
  documents: PacketDocumentInput[];
}

export interface PacketBuildInput extends PacketInput {
  /** Active legal holds for the property (used in counsel packet & receipt). */
  holds: LegalHold[];
  /** Audit events relevant to this packet's scope (passed in by backend). */
  audit: PacketAuditInput;
}

export interface PacketBundle {
  manifestJsonBuffer: Buffer;
  manifestCsvBuffer: Buffer;
  summaryPdfBuffer: Buffer;
  exportReceiptPdfBuffer: Buffer;
  zipBuffer: Buffer;
  /** Sha256 hex of the manifest JSON bytes. */
  manifestSha256: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Holds policy
// ─────────────────────────────────────────────────────────────────────────────

export type HoldScope =
  | { kind: 'property'; id: PropertyId }
  | { kind: 'exception'; id: ExceptionId }
  | { kind: 'document'; id: DocumentId }
  | { kind: 'document_version'; id: DocumentVersionId }
  | { kind: 'evidence_item'; id: EvidenceItemId }
  | { kind: 'packet'; id: PacketId };

export type HoldAction = 'delete' | 'overwrite_original' | 'append_derivative' | 'read';

export interface HoldsSummary {
  active_holds: Array<{
    id: string;
    name: string;
    reason: string;
    issued_at: IsoDateTime | null;
    subject_count: number;
  }>;
  total_active: number;
  total_subjects: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit / receipt
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportReceiptInput {
  packet_id: PacketId;
  packet_type: PacketType;
  property_id: PropertyId;
  generated_at: IsoDateTime;
  generated_by: PacketManifestActor;
  file_count: number;
  byte_size_total: number;
  legal_hold_active: boolean;
  manifest_sha256: string;
}

export interface ExportReceipt extends ExportReceiptInput {
  /** Library schema version for the receipt. */
  schema_version: '1.0';
}

// Re-export some domain types so consumers don't need to import twice.
export type {
  Contradiction,
  ContradictionType,
  DocumentClaim,
  EvidenceItem,
  LegalHold,
  PacketType,
  Severity,
  ExceptionType,
  HoldStatus,
} from '@fireproof/domain/types';
export type { DocumentClaimId, ExceptionId };

/**
 * Cross-cutting enums used by the Fireproof domain.
 *
 * Use the `*Values` const arrays for `z.enum(...)` schemas, and the
 * exported types for non-Zod TypeScript code. Do not redeclare these values
 * elsewhere — every package imports them from `@fireproof/domain/enums`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exception type
// ─────────────────────────────────────────────────────────────────────────────

export const ExceptionTypeValues = [
  'impairment',
  'deficiency',
  'carrier_recommendation',
  'asset_identity',
] as const;

export type ExceptionType = (typeof ExceptionTypeValues)[number];

export const ExceptionType = {
  Impairment: 'impairment',
  Deficiency: 'deficiency',
  CarrierRecommendation: 'carrier_recommendation',
  AssetIdentity: 'asset_identity',
} as const satisfies Record<string, ExceptionType>;

// ─────────────────────────────────────────────────────────────────────────────
// Severity
// ─────────────────────────────────────────────────────────────────────────────

export const SeverityValues = [
  'low',
  'medium',
  'medium_high',
  'high',
  'critical',
] as const;

export type Severity = (typeof SeverityValues)[number];

export const Severity = {
  Low: 'low',
  Medium: 'medium',
  MediumHigh: 'medium_high',
  High: 'high',
  Critical: 'critical',
} as const satisfies Record<string, Severity>;

// ─────────────────────────────────────────────────────────────────────────────
// Jurisdiction confidence
// ─────────────────────────────────────────────────────────────────────────────

export const JurisdictionConfidenceValues = [
  'high',
  'medium',
  'low_inferred',
] as const;

export type JurisdictionConfidence = (typeof JurisdictionConfidenceValues)[number];

export const JurisdictionConfidence = {
  High: 'high',
  Medium: 'medium',
  LowInferred: 'low_inferred',
} as const satisfies Record<string, JurisdictionConfidence>;

// ─────────────────────────────────────────────────────────────────────────────
// Hold status (per exception / per document)
// ─────────────────────────────────────────────────────────────────────────────

export const HoldStatusValues = [
  'none',
  'pending',
  'active',
  'released',
] as const;

export type HoldStatus = (typeof HoldStatusValues)[number];

export const HoldStatus = {
  None: 'none',
  Pending: 'pending',
  Active: 'active',
  Released: 'released',
} as const satisfies Record<string, HoldStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Document source type
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentSourceTypeValues = [
  'report',
  'email',
  'photo',
  'audio',
  'voicemail',
  'log',
  'proposal',
  'certificate',
  'other',
] as const;

export type DocumentSourceType = (typeof DocumentSourceTypeValues)[number];

export const DocumentSourceType = {
  Report: 'report',
  Email: 'email',
  Photo: 'photo',
  Audio: 'audio',
  Voicemail: 'voicemail',
  Log: 'log',
  Proposal: 'proposal',
  Certificate: 'certificate',
  Other: 'other',
} as const satisfies Record<string, DocumentSourceType>;

// ─────────────────────────────────────────────────────────────────────────────
// Evidence type — fixed taxonomy referenced by rule packs
// ─────────────────────────────────────────────────────────────────────────────

export const EvidenceTypeValues = [
  'notification_proof',
  'fire_watch_record',
  'restoration_test_record',
  'photo_evidence',
  'customer_decision',
  'proposal_transmission_proof',
  'asset_identity_proof',
  'original_source_document',
  'counsel_hold_notice',
] as const;

export type EvidenceType = (typeof EvidenceTypeValues)[number];

export const EvidenceType = {
  NotificationProof: 'notification_proof',
  FireWatchRecord: 'fire_watch_record',
  RestorationTestRecord: 'restoration_test_record',
  PhotoEvidence: 'photo_evidence',
  CustomerDecision: 'customer_decision',
  ProposalTransmissionProof: 'proposal_transmission_proof',
  AssetIdentityProof: 'asset_identity_proof',
  OriginalSourceDocument: 'original_source_document',
  CounselHoldNotice: 'counsel_hold_notice',
} as const satisfies Record<string, EvidenceType>;

// ─────────────────────────────────────────────────────────────────────────────
// Evidence status
// ─────────────────────────────────────────────────────────────────────────────

export const EvidenceStatusValues = [
  'missing',
  'pending',
  'insufficient',
  'valid',
  'waived',
] as const;

export type EvidenceStatus = (typeof EvidenceStatusValues)[number];

export const EvidenceStatus = {
  Missing: 'missing',
  Pending: 'pending',
  Insufficient: 'insufficient',
  Valid: 'valid',
  Waived: 'waived',
} as const satisfies Record<string, EvidenceStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Packet type
// ─────────────────────────────────────────────────────────────────────────────

export const PacketTypeValues = [
  'AHJ_NOV_RESPONSE',
  'OWNER_RESPONSE',
  'INSURER_LOSS_CONTROL',
  'COUNSEL_SUBROGATION',
] as const;

export type PacketType = (typeof PacketTypeValues)[number];

export const PacketType = {
  AhjNovResponse: 'AHJ_NOV_RESPONSE',
  OwnerResponse: 'OWNER_RESPONSE',
  InsurerLossControl: 'INSURER_LOSS_CONTROL',
  CounselSubrogation: 'COUNSEL_SUBROGATION',
} as const satisfies Record<string, PacketType>;

// ─────────────────────────────────────────────────────────────────────────────
// Packet status
// ─────────────────────────────────────────────────────────────────────────────

export const PacketStatusValues = [
  'draft',
  'ready',
  'emitted',
  'archived',
] as const;

export type PacketStatus = (typeof PacketStatusValues)[number];

export const PacketStatus = {
  Draft: 'draft',
  Ready: 'ready',
  Emitted: 'emitted',
  Archived: 'archived',
} as const satisfies Record<string, PacketStatus>;

// ─────────────────────────────────────────────────────────────────────────────
// Notification channel / status
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationChannelValues = [
  'email',
  'sms',
  'in_app',
  'webhook',
] as const;
export type NotificationChannel = (typeof NotificationChannelValues)[number];

export const NotificationStatusValues = [
  'queued',
  'sent',
  'delivered',
  'failed',
  'bounced',
] as const;
export type NotificationStatus = (typeof NotificationStatusValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Contradiction resolution status
// ─────────────────────────────────────────────────────────────────────────────

export const ContradictionResolutionStatusValues = [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
] as const;
export type ContradictionResolutionStatus =
  (typeof ContradictionResolutionStatusValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// User role
// ─────────────────────────────────────────────────────────────────────────────

export const UserRoleValues = [
  'admin',
  'manager',
  'inspector',
  'office',
  'viewer',
  'integration',
] as const;
export type UserRole = (typeof UserRoleValues)[number];

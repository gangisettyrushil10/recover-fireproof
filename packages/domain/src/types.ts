/**
 * `@fireproof/domain/types` — re-export of just the inferred TypeScript
 * types (no runtime Zod schemas). Useful where bundle size matters and
 * you don't need the validators.
 */

export type {
  ExceptionType,
  Severity,
  JurisdictionConfidence,
  HoldStatus,
  DocumentSourceType,
  EvidenceType,
  EvidenceStatus,
  PacketType,
  PacketStatus,
  NotificationChannel,
  NotificationStatus,
  ContradictionResolutionStatus,
  UserRole,
} from './enums.js';

export type {
  ImpairmentState,
  DeficiencyState,
  CarrierRecommendationState,
  AssetIdentityState,
  ExceptionState,
  StateOf,
} from './states.js';

export type { DomainErrorCode, DomainErrorOptions } from './errors.js';

export type {
  Brand,
  BrandedId,
  OrganizationId,
  UserId,
  PropertyId,
  JurisdictionId,
  SystemId,
  AssetId,
  ExceptionId,
  EvidenceItemId,
  DocumentId,
  DocumentVersionId,
  DocumentClaimId,
  RulePackId,
  RuleBindingId,
  RuleEvaluationId,
  ContradictionId,
  PacketId,
  PacketItemId,
  LegalHoldId,
  NotificationId,
  AuditEventId,
} from './schemas/_branded.js';

export type {
  IsoDateTime,
  IsoDate,
  Sha256,
  ByteSize,
  Confidence,
  Metadata,
  TimeRange,
  EntityRefKind,
  EntityRef,
} from './schemas/_primitives.js';

export type { Organization, OrganizationCreate } from './schemas/organization.js';
export type { User, UserCreate } from './schemas/user.js';
export type { Jurisdiction } from './schemas/jurisdiction.js';
export type { Property, PropertyAddress } from './schemas/property.js';
export type { System, SystemKind } from './schemas/system.js';
export type { Asset, AssetKind } from './schemas/asset.js';

export type {
  Exception,
  ExceptionCreate,
  ImpairmentException,
  DeficiencyException,
  CarrierRecommendationException,
  AssetIdentityException,
} from './schemas/exception.js';

export type { EvidenceItem, EvidenceItemUpsert } from './schemas/evidence-item.js';

export type { Document, DocumentCreate } from './schemas/document.js';
export type { DocumentVersion, DocumentVersionCreate } from './schemas/document-version.js';
export type { DocumentClaim, ClaimType } from './schemas/document-claim.js';

export type { RulePack, RuleRequirement } from './schemas/rule-pack.js';
export type { RuleBinding, RuleBindingScope } from './schemas/rule-binding.js';
export type { RuleEvaluation, RequirementResult } from './schemas/rule-evaluation.js';

export type { Contradiction, ContradictionType } from './schemas/contradiction.js';

export type { Packet, PacketCreate } from './schemas/packet.js';
export type { PacketItem, PacketItemKind } from './schemas/packet-item.js';

export type { LegalHold, LegalHoldCreate } from './schemas/legal-hold.js';
export type { Notification } from './schemas/notification.js';
export type { AuditEvent, AuditAction } from './schemas/audit-event.js';

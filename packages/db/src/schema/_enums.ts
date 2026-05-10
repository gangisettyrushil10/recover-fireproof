/**
 * Postgres enums mirroring the canonical string values in `@fireproof/domain`.
 *
 * Each `pgEnum` here uses the same `*Values` const arrays exported from the
 * domain package, so the DB layer cannot drift from the wire format.
 */

import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ContradictionResolutionStatusValues,
  DocumentSourceTypeValues,
  EvidenceStatusValues,
  EvidenceTypeValues,
  ExceptionTypeValues,
  HoldStatusValues,
  JurisdictionConfidenceValues,
  NotificationChannelValues,
  NotificationStatusValues,
  PacketStatusValues,
  PacketTypeValues,
  SeverityValues,
  UserRoleValues,
} from '@fireproof/domain/enums';
import {
  AssetIdentityStateValues,
  CarrierRecommendationStateValues,
  DeficiencyStateValues,
  ImpairmentStateValues,
} from '@fireproof/domain/states';
import {
  AuditActionValues,
  ContradictionTypeValues,
} from '@fireproof/domain/schemas';
import { ClaimTypeValues } from '@fireproof/domain/schemas';
import { SystemKindValues } from '@fireproof/domain/schemas';
import { AssetKindValues } from '@fireproof/domain/schemas';
import { PacketItemKindValues } from '@fireproof/domain/schemas';
import { RuleBindingScopeValues } from '@fireproof/domain/schemas';

// ─── Organization kind (not in domain enums; product-level taxonomy) ────────
export const OrganizationKindValues = [
  'contractor',
  'owner',
  'manager',
  'ahj',
  'insurer',
  'counsel',
  'platform',
] as const;
export type OrganizationKind = (typeof OrganizationKindValues)[number];

// ─── pgEnum declarations ────────────────────────────────────────────────────

export const organizationKindEnum = pgEnum(
  'organization_kind',
  // drizzle-orm pgEnum requires a tuple at the type level
  OrganizationKindValues as unknown as [string, ...string[]],
);

export const userRoleEnum = pgEnum(
  'user_role',
  UserRoleValues as unknown as [string, ...string[]],
);

export const exceptionTypeEnum = pgEnum(
  'exception_type',
  ExceptionTypeValues as unknown as [string, ...string[]],
);

export const severityEnum = pgEnum(
  'severity',
  SeverityValues as unknown as [string, ...string[]],
);

export const jurisdictionConfidenceEnum = pgEnum(
  'jurisdiction_confidence',
  JurisdictionConfidenceValues as unknown as [string, ...string[]],
);

export const holdStatusEnum = pgEnum(
  'hold_status',
  HoldStatusValues as unknown as [string, ...string[]],
);

export const documentSourceTypeEnum = pgEnum(
  'document_source_type',
  DocumentSourceTypeValues as unknown as [string, ...string[]],
);

export const evidenceTypeEnum = pgEnum(
  'evidence_type',
  EvidenceTypeValues as unknown as [string, ...string[]],
);

export const evidenceStatusEnum = pgEnum(
  'evidence_status',
  EvidenceStatusValues as unknown as [string, ...string[]],
);

export const packetTypeEnum = pgEnum(
  'packet_type',
  PacketTypeValues as unknown as [string, ...string[]],
);

export const packetStatusEnum = pgEnum(
  'packet_status',
  PacketStatusValues as unknown as [string, ...string[]],
);

export const packetItemKindEnum = pgEnum(
  'packet_item_kind',
  PacketItemKindValues as unknown as [string, ...string[]],
);

export const contradictionTypeEnum = pgEnum(
  'contradiction_type',
  ContradictionTypeValues as unknown as [string, ...string[]],
);

export const contradictionResolutionStatusEnum = pgEnum(
  'contradiction_resolution_status',
  ContradictionResolutionStatusValues as unknown as [string, ...string[]],
);

export const notificationChannelEnum = pgEnum(
  'notification_channel',
  NotificationChannelValues as unknown as [string, ...string[]],
);

export const notificationStatusEnum = pgEnum(
  'notification_status',
  NotificationStatusValues as unknown as [string, ...string[]],
);

export const auditActionEnum = pgEnum(
  'audit_action',
  AuditActionValues as unknown as [string, ...string[]],
);

export const claimTypeEnum = pgEnum(
  'claim_type',
  ClaimTypeValues as unknown as [string, ...string[]],
);

export const systemKindEnum = pgEnum(
  'system_kind',
  SystemKindValues as unknown as [string, ...string[]],
);

export const assetKindEnum = pgEnum(
  'asset_kind',
  AssetKindValues as unknown as [string, ...string[]],
);

export const ruleBindingScopeEnum = pgEnum(
  'rule_binding_scope',
  RuleBindingScopeValues as unknown as [string, ...string[]],
);

// Per-exception-type state enums. We keep one PG enum per type so the FKs and
// indexes can stay strict, mirroring the domain's discriminated union.

export const impairmentStateEnum = pgEnum(
  'impairment_state',
  ImpairmentStateValues as unknown as [string, ...string[]],
);
export const deficiencyStateEnum = pgEnum(
  'deficiency_state',
  DeficiencyStateValues as unknown as [string, ...string[]],
);
export const carrierRecommendationStateEnum = pgEnum(
  'carrier_recommendation_state',
  CarrierRecommendationStateValues as unknown as [string, ...string[]],
);
export const assetIdentityStateEnum = pgEnum(
  'asset_identity_state',
  AssetIdentityStateValues as unknown as [string, ...string[]],
);

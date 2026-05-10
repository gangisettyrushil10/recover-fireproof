/**
 * Branded ID helpers. Every entity exports its own `XId` branded type so
 * that mixing them at compile time is a type error.
 */

import { z } from 'zod';

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };
export type BrandedId<B extends string> = Brand<string, `${B}Id`>;

/**
 * Build a Zod schema for a branded UUID v4 ID.
 *
 *   const ExceptionIdSchema = brandedIdSchema('Exception');
 *   type ExceptionId = z.infer<typeof ExceptionIdSchema>;
 */
export function brandedIdSchema<B extends string>(
  _brand: B,
): z.ZodType<BrandedId<B>, z.ZodTypeDef, string> {
  return z.string().uuid() as unknown as z.ZodType<BrandedId<B>, z.ZodTypeDef, string>;
}

// ─── Shared branded ID schemas ──────────────────────────────────────────────

export const OrganizationIdSchema = brandedIdSchema('Organization');
export type OrganizationId = z.infer<typeof OrganizationIdSchema>;

export const UserIdSchema = brandedIdSchema('User');
export type UserId = z.infer<typeof UserIdSchema>;

export const PropertyIdSchema = brandedIdSchema('Property');
export type PropertyId = z.infer<typeof PropertyIdSchema>;

export const JurisdictionIdSchema = brandedIdSchema('Jurisdiction');
export type JurisdictionId = z.infer<typeof JurisdictionIdSchema>;

export const SystemIdSchema = brandedIdSchema('System');
export type SystemId = z.infer<typeof SystemIdSchema>;

export const AssetIdSchema = brandedIdSchema('Asset');
export type AssetId = z.infer<typeof AssetIdSchema>;

export const ExceptionIdSchema = brandedIdSchema('Exception');
export type ExceptionId = z.infer<typeof ExceptionIdSchema>;

export const EvidenceItemIdSchema = brandedIdSchema('EvidenceItem');
export type EvidenceItemId = z.infer<typeof EvidenceItemIdSchema>;

export const DocumentIdSchema = brandedIdSchema('Document');
export type DocumentId = z.infer<typeof DocumentIdSchema>;

export const DocumentVersionIdSchema = brandedIdSchema('DocumentVersion');
export type DocumentVersionId = z.infer<typeof DocumentVersionIdSchema>;

export const DocumentClaimIdSchema = brandedIdSchema('DocumentClaim');
export type DocumentClaimId = z.infer<typeof DocumentClaimIdSchema>;

export const RulePackIdSchema = brandedIdSchema('RulePack');
export type RulePackId = z.infer<typeof RulePackIdSchema>;

export const RuleBindingIdSchema = brandedIdSchema('RuleBinding');
export type RuleBindingId = z.infer<typeof RuleBindingIdSchema>;

export const RuleEvaluationIdSchema = brandedIdSchema('RuleEvaluation');
export type RuleEvaluationId = z.infer<typeof RuleEvaluationIdSchema>;

export const ContradictionIdSchema = brandedIdSchema('Contradiction');
export type ContradictionId = z.infer<typeof ContradictionIdSchema>;

export const PacketIdSchema = brandedIdSchema('Packet');
export type PacketId = z.infer<typeof PacketIdSchema>;

export const PacketItemIdSchema = brandedIdSchema('PacketItem');
export type PacketItemId = z.infer<typeof PacketItemIdSchema>;

export const LegalHoldIdSchema = brandedIdSchema('LegalHold');
export type LegalHoldId = z.infer<typeof LegalHoldIdSchema>;

export const NotificationIdSchema = brandedIdSchema('Notification');
export type NotificationId = z.infer<typeof NotificationIdSchema>;

export const AuditEventIdSchema = brandedIdSchema('AuditEvent');
export type AuditEventId = z.infer<typeof AuditEventIdSchema>;

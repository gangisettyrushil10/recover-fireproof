import { z } from 'zod';
import {
  ExceptionTypeValues,
  HoldStatusValues,
  JurisdictionConfidenceValues,
  SeverityValues,
} from '../enums.js';
import {
  AssetIdentityStateValues,
  CarrierRecommendationStateValues,
  DeficiencyStateValues,
  ImpairmentStateValues,
} from '../states.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  AssetIdSchema,
  ExceptionIdSchema,
  JurisdictionIdSchema,
  OrganizationIdSchema,
  PropertyIdSchema,
  SystemIdSchema,
  UserIdSchema,
} from './_branded.js';

/** Common fields across every exception type. */
const ExceptionBaseSchema = z.object({
  id: ExceptionIdSchema,
  organization_id: OrganizationIdSchema,
  property_id: PropertyIdSchema,
  system_id: SystemIdSchema.nullable().optional(),
  asset_id: AssetIdSchema.nullable().optional(),
  jurisdiction_id: JurisdictionIdSchema.nullable().optional(),
  jurisdiction_confidence: z.enum(JurisdictionConfidenceValues).nullable().optional(),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  severity: z.enum(SeverityValues),
  hold_status: z.enum(HoldStatusValues).default('none'),
  opened_at: IsoDateTimeSchema,
  closed_at: IsoDateTimeSchema.nullable().optional(),
  due_at: IsoDateTimeSchema.nullable().optional(),
  assigned_user_id: UserIdSchema.nullable().optional(),
  reporter_user_id: UserIdSchema.nullable().optional(),
  rule_pack_id: z.string().uuid().nullable().optional(),
  metadata: MetadataSchema.default({}),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});

// ─── Per-type variants (discriminator: `type`) ──────────────────────────────

export const ImpairmentExceptionSchema = ExceptionBaseSchema.extend({
  type: z.literal('impairment'),
  state: z.enum(ImpairmentStateValues),
});
export type ImpairmentException = z.infer<typeof ImpairmentExceptionSchema>;

export const DeficiencyExceptionSchema = ExceptionBaseSchema.extend({
  type: z.literal('deficiency'),
  state: z.enum(DeficiencyStateValues),
});
export type DeficiencyException = z.infer<typeof DeficiencyExceptionSchema>;

export const CarrierRecommendationExceptionSchema = ExceptionBaseSchema.extend({
  type: z.literal('carrier_recommendation'),
  state: z.enum(CarrierRecommendationStateValues),
});
export type CarrierRecommendationException = z.infer<
  typeof CarrierRecommendationExceptionSchema
>;

export const AssetIdentityExceptionSchema = ExceptionBaseSchema.extend({
  type: z.literal('asset_identity'),
  state: z.enum(AssetIdentityStateValues),
});
export type AssetIdentityException = z.infer<typeof AssetIdentityExceptionSchema>;

// ─── Discriminated union ────────────────────────────────────────────────────

export const ExceptionSchema = z.discriminatedUnion('type', [
  ImpairmentExceptionSchema,
  DeficiencyExceptionSchema,
  CarrierRecommendationExceptionSchema,
  AssetIdentityExceptionSchema,
]);
export type Exception = z.infer<typeof ExceptionSchema>;

// ─── Create payload (state inferred from type at the API layer) ─────────────

export const ExceptionCreateSchema = z.object({
  type: z.enum(ExceptionTypeValues),
  organization_id: OrganizationIdSchema,
  property_id: PropertyIdSchema,
  system_id: SystemIdSchema.nullable().optional(),
  asset_id: AssetIdSchema.nullable().optional(),
  jurisdiction_id: JurisdictionIdSchema.nullable().optional(),
  jurisdiction_confidence: z.enum(JurisdictionConfidenceValues).nullable().optional(),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  severity: z.enum(SeverityValues),
  due_at: IsoDateTimeSchema.nullable().optional(),
  assigned_user_id: UserIdSchema.nullable().optional(),
  reporter_user_id: UserIdSchema.nullable().optional(),
  metadata: MetadataSchema.optional(),
});
export type ExceptionCreate = z.infer<typeof ExceptionCreateSchema>;

import { z } from 'zod';
import { ExceptionTypeValues } from '../enums.js';
import { IsoDateTimeSchema, MetadataSchema } from './_primitives.js';
import {
  JurisdictionIdSchema,
  OrganizationIdSchema,
  PropertyIdSchema,
  RuleBindingIdSchema,
  RulePackIdSchema,
} from './_branded.js';

/**
 * Binds a rule pack to a (jurisdiction, exception_type) tuple, optionally
 * scoped to a specific property override. Resolution order at evaluation
 * time: property → jurisdiction → org-default.
 */
export const RuleBindingScopeValues = ['organization', 'jurisdiction', 'property'] as const;
export type RuleBindingScope = (typeof RuleBindingScopeValues)[number];

export const RuleBindingSchema = z
  .object({
    id: RuleBindingIdSchema,
    organization_id: OrganizationIdSchema,
    rule_pack_id: RulePackIdSchema,
    scope: z.enum(RuleBindingScopeValues),
    jurisdiction_id: JurisdictionIdSchema.nullable().optional(),
    property_id: PropertyIdSchema.nullable().optional(),
    exception_type: z.enum(ExceptionTypeValues),
    /** Higher wins when multiple bindings match; ties broken by scope. */
    priority: z.number().int().default(0),
    is_active: z.boolean().default(true),
    metadata: MetadataSchema.default({}),
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .superRefine((b, ctx) => {
    if (b.scope === 'jurisdiction' && !b.jurisdiction_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'jurisdiction_id required for jurisdiction-scoped binding',
        path: ['jurisdiction_id'],
      });
    }
    if (b.scope === 'property' && !b.property_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'property_id required for property-scoped binding',
        path: ['property_id'],
      });
    }
  });
export type RuleBinding = z.infer<typeof RuleBindingSchema>;

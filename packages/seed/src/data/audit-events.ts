/**
 * Synthetic audit events for each seeded entity creation. The dashboard
 * shows the most recent ten events; this gives the demo a non-empty
 * activity feed without having to drive every action through the API.
 */

import { DEFAULT_ORG_ID } from './organizations.js';
import { EXCEPTIONS } from './exceptions.js';
import { DOCUMENTS } from './documents.js';
import { CONTRADICTIONS } from './contradictions.js';
import { dayOffset, stableId } from '../util.js';
import { USER_SLUGS } from '../ids.js';

export interface SeedAuditEvent {
  slug: string;
  id: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  relatedKind: string | null;
  relatedId: string | null;
  actorUserId: string | null;
  isSystemActor: boolean;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  detail: Record<string, unknown>;
  occurredAt: Date;
}

const lparkId = stableId(USER_SLUGS.lpark);

export const AUDIT_EVENTS: SeedAuditEvent[] = [
  ...EXCEPTIONS.map(
    (e): SeedAuditEvent => ({
      slug: `audit_exception_created_${e.slug}`,
      id: stableId(`audit_exception_created_${e.slug}`),
      organizationId: DEFAULT_ORG_ID,
      action: 'exception.created',
      entityType: 'exception',
      entityId: e.id,
      relatedKind: 'property',
      relatedId: e.propertyId,
      actorUserId: e.reporterUserId,
      isSystemActor: false,
      beforeJson: null,
      afterJson: { state: e.state, severity: e.severity, type: e.type },
      detail: { type: e.type, title: e.title },
      occurredAt: e.openedAt,
    }),
  ),
  ...DOCUMENTS.map(
    (d): SeedAuditEvent => ({
      slug: `audit_document_created_${d.slug}`,
      id: stableId(`audit_document_created_${d.slug}`),
      organizationId: DEFAULT_ORG_ID,
      action: 'document.created',
      entityType: 'document',
      entityId: d.id,
      relatedKind: 'property',
      relatedId: d.propertyId,
      actorUserId: lparkId,
      isSystemActor: false,
      beforeJson: null,
      afterJson: null,
      detail: { source_type: d.sourceType, title: d.title },
      occurredAt: d.documentDate,
    }),
  ),
  ...CONTRADICTIONS.map(
    (c): SeedAuditEvent => ({
      slug: `audit_contradiction_${c.slug}`,
      id: stableId(`audit_contradiction_${c.slug}`),
      organizationId: DEFAULT_ORG_ID,
      action: 'contradiction.detected',
      entityType: 'contradiction',
      entityId: c.id,
      relatedKind: 'property',
      relatedId: c.propertyId,
      actorUserId: null,
      isSystemActor: true,
      beforeJson: null,
      afterJson: null,
      detail: { type: c.type, severity: c.severity, confidence: c.confidence },
      occurredAt: dayOffset(-30, '12:00:00'),
    }),
  ),
];

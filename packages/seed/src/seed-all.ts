/**
 * Cedar Heights demo orchestrator.
 *
 * Inserts every seed entity in dependency order. Idempotent thanks to
 * `onConflictDoNothing()` keyed off our deterministic UUIDs. Pass `reset: true`
 * to truncate everything first; `postFire: true` activates a post-fire legal
 * hold scenario for demo step 8.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { schema, type Database } from '@fireproof/db';
import { sql } from 'drizzle-orm';
import { ORGANIZATIONS } from './data/organizations.js';
import { USERS } from './data/users.js';
import { JURISDICTIONS } from './data/jurisdictions.js';
import { RULE_PACKS } from './data/rule-packs.js';
import { PROPERTIES } from './data/properties.js';
import { RULE_BINDINGS } from './data/rule-bindings.js';
import { SYSTEMS } from './data/systems.js';
import { ASSETS } from './data/assets.js';
import { EXCEPTIONS } from './data/exceptions.js';
import { EXCEPTION_STATE_HISTORY } from './data/exception-state-history.js';
import { EVIDENCE_ITEMS } from './data/evidence-items.js';
import { DOCUMENTS, buildAllVersions } from './data/documents.js';
import { DOCUMENT_CLAIMS } from './data/document-claims.js';
import { CONTRADICTIONS } from './data/contradictions.js';
import { RULE_EVALUATIONS } from './data/rule-evaluations.js';
import { AUDIT_EVENTS } from './data/audit-events.js';
import { NOTIFICATIONS } from './data/notifications.js';
import { stableId } from './util.js';

const STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT
  ? path.resolve(process.env.LOCAL_STORAGE_ROOT)
  : path.resolve(process.cwd(), '.storage');

const TABLES_IN_REVERSE_DEPENDENCY: string[] = [
  'audit_events',
  'notifications',
  'packet_items',
  'packets',
  'contradictions',
  'rule_evaluations',
  'document_claims',
  'document_versions',
  'documents',
  'evidence_items',
  'exception_state_history',
  'exceptions',
  'rule_bindings',
  'rule_packs',
  'assets',
  'systems',
  'properties',
  'jurisdictions',
  'legal_holds',
  'users',
  'organizations',
];

export interface SeedOptions {
  reset?: boolean;
  postFire?: boolean;
}

export interface SeedResult {
  inserted: Record<string, number>;
}

async function truncateAll(db: Database): Promise<void> {
  for (const t of TABLES_IN_REVERSE_DEPENDENCY) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${t} CASCADE`));
  }
}

async function writeBlob(storageKey: string, bytes: Buffer): Promise<void> {
  const abs = path.join(STORAGE_ROOT, storageKey);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  try {
    await fs.access(abs);
    return; // already there — preserve original
  } catch {
    // continue
  }
  await fs.writeFile(abs, bytes);
}

export async function seedAll(db: Database, opts: SeedOptions = {}): Promise<SeedResult> {
  const inserted: Record<string, number> = {};
  if (opts.reset) {
    await truncateAll(db);
  }

  // ─── orgs ───
  await db
    .insert(schema.organizations)
    .values(
      ORGANIZATIONS.map((o) => ({
        id: o.id,
        kind: o.kind,
        name: o.name,
        slug: o.slug,
        status: o.status,
        timezone: o.timezone,
        settings: {},
        is_active: true,
      })),
    )
    .onConflictDoNothing();
  inserted.organizations = ORGANIZATIONS.length;

  // ─── users ───
  await db
    .insert(schema.users)
    .values(
      USERS.map((u) => ({
        id: u.id,
        organization_id: u.organizationId,
        email: u.email,
        full_name: u.fullName,
        role: u.role,
        is_active: true,
        mfa_required: false,
        metadata: u.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.users = USERS.length;

  // ─── jurisdictions ───
  await db
    .insert(schema.jurisdictions)
    .values(
      JURISDICTIONS.map((j) => ({
        id: j.id,
        name: j.name,
        ahj_name: j.ahjName,
        state_code: j.stateCode,
        county: j.county,
        city: j.city,
        default_rule_pack_id: j.defaultRulePackId,
        confidence: j.confidence,
        metadata: j.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.jurisdictions = JURISDICTIONS.length;

  // ─── rule packs ───
  await db
    .insert(schema.rule_packs)
    .values(
      RULE_PACKS.map((rp) => ({
        id: rp.id,
        organization_id: rp.organizationId,
        jurisdiction_id: rp.jurisdictionId,
        key: rp.key,
        name: rp.name,
        version: rp.version,
        description: rp.description,
        effective_from: rp.effectiveFrom,
        source_note: rp.sourceNote,
        status: rp.status,
        is_active: rp.isActive,
        requirements: rp.requirements,
        metadata: rp.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.rule_packs = RULE_PACKS.length;

  // ─── properties ───
  await db
    .insert(schema.properties)
    .values(
      PROPERTIES.map((p) => ({
        id: p.id,
        organization_id: p.organizationId,
        owner_org_id: p.ownerOrgId,
        manager_org_id: p.managerOrgId,
        jurisdiction_id: p.jurisdictionId,
        name: p.name,
        address_json: p.addressJson,
        metadata: p.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.properties = PROPERTIES.length;

  // ─── rule_bindings ───
  await db
    .insert(schema.rule_bindings)
    .values(
      RULE_BINDINGS.map((rb) => ({
        id: rb.id,
        organization_id: rb.organizationId,
        rule_pack_id: rb.rulePackId,
        scope: rb.scope,
        jurisdiction_id: rb.jurisdictionId,
        property_id: rb.propertyId,
        exception_type: rb.exceptionType,
        priority: rb.priority,
        is_active: rb.isActive,
        override_json: {},
        metadata: rb.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.rule_bindings = RULE_BINDINGS.length;

  // ─── systems ───
  await db
    .insert(schema.systems)
    .values(
      SYSTEMS.map((s) => ({
        id: s.id,
        organization_id: s.organizationId,
        property_id: s.propertyId,
        kind: s.kind as never,
        system_class: s.systemClass,
        label: s.label,
        name: s.name,
        location: s.location,
        standard_ref: s.standardRef,
        description: s.description,
        metadata: s.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.systems = SYSTEMS.length;

  // ─── assets ───
  await db
    .insert(schema.assets)
    .values(
      ASSETS.map((a) => ({
        id: a.id,
        organization_id: a.organizationId,
        property_id: a.propertyId,
        system_id: a.systemId,
        kind: a.kind as never,
        identifier: a.identifier,
        manufacturer: a.manufacturer,
        model: a.model,
        serial_number: a.serialNumber,
        installed_at: a.installedAt,
        location_description: a.locationDescription,
        metadata: a.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.assets = ASSETS.length;

  // ─── exceptions ───
  await db
    .insert(schema.exceptions)
    .values(
      EXCEPTIONS.map((e) => ({
        id: e.id,
        organization_id: e.organizationId,
        property_id: e.propertyId,
        system_id: e.systemId,
        asset_id: e.assetId,
        jurisdiction_id: e.jurisdictionId,
        jurisdiction_confidence: e.jurisdictionConfidence,
        type: e.type,
        state: e.state,
        severity: e.severity,
        hold_status: e.holdStatus,
        title: e.title,
        summary: e.summary,
        rule_pack_id: e.rulePackId,
        assigned_user_id: e.assignedUserId,
        reporter_user_id: e.reporterUserId,
        opened_at: e.openedAt,
        closed_at: e.closedAt,
        due_at: e.dueAt,
        metadata: e.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.exceptions = EXCEPTIONS.length;

  // ─── exception_state_history ───
  await db
    .insert(schema.exception_state_history)
    .values(
      EXCEPTION_STATE_HISTORY.map((h) => ({
        id: h.id,
        organization_id: h.organizationId,
        exception_id: h.exceptionId,
        from_state: h.fromState,
        to_state: h.toState,
        changed_by_user_id: h.changedByUserId,
        reason: h.reason,
        detail: h.detail,
        occurred_at: h.occurredAt,
      })),
    )
    .onConflictDoNothing();
  inserted.exception_state_history = EXCEPTION_STATE_HISTORY.length;

  // ─── evidence_items ───
  await db
    .insert(schema.evidence_items)
    .values(
      EVIDENCE_ITEMS.map((it) => ({
        id: it.id,
        organization_id: it.organizationId,
        exception_id: it.exceptionId,
        evidence_type: it.evidenceType,
        status: it.status,
        required: it.required,
        blocking: it.blocking,
        payload: it.payload,
        validation_errors_json: it.validationErrors,
        notes: it.notes,
        captured_at: it.capturedAt,
        validated_at: it.validatedAt,
      })),
    )
    .onConflictDoNothing();
  inserted.evidence_items = EVIDENCE_ITEMS.length;

  // ─── documents ───
  await db
    .insert(schema.documents)
    .values(
      DOCUMENTS.map((d) => ({
        id: d.id,
        organization_id: d.organizationId,
        property_id: d.propertyId,
        exception_id: d.exceptionSlug ? stableId(d.exceptionSlug) : null,
        source_type: d.sourceType,
        title: d.title,
        description: d.description,
        document_date: d.documentDate,
        uploaded_by_user_id: d.uploaderUserId,
        metadata: d.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.documents = DOCUMENTS.length;

  // ─── document_versions (writes blobs to storage) ───
  const versions = await buildAllVersions();
  for (const v of versions) {
    await writeBlob(v.storageKey, v.bytes);
  }
  await db
    .insert(schema.document_versions)
    .values(
      versions.map((v) => ({
        id: stableId(`docver_${v.documentSlug}_v1`),
        organization_id: v.organizationId,
        document_id: v.documentId,
        version_no: v.versionNo,
        sha256: v.sha256,
        storage_key: v.storageKey,
        mime_type: v.mimeType,
        byte_size: v.byteSize,
        is_original: v.isOriginal,
        uploaded_at: v.uploadedAt,
        uploaded_by_user_id: v.uploaderUserId,
        metadata: v.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.document_versions = versions.length;

  // ─── document_claims ───
  await db
    .insert(schema.document_claims)
    .values(
      DOCUMENT_CLAIMS.map((c) => ({
        id: c.id,
        organization_id: c.organizationId,
        document_version_id: stableId(`docver_${c.documentVersionSlug}_v1`),
        claim_type: c.claimType,
        claim_subject_kind: c.claimSubjectKind,
        claim_subject_ref: c.claimSubjectRef,
        claim_value_json: c.claimValue,
        claim_time_range_json: c.claimTimeRange,
        confidence: String(c.confidence),
        provenance: c.provenance,
      })),
    )
    .onConflictDoNothing();
  inserted.document_claims = DOCUMENT_CLAIMS.length;

  // ─── rule_evaluations ───
  await db
    .insert(schema.rule_evaluations)
    .values(
      RULE_EVALUATIONS.map((re) => ({
        id: re.id,
        organization_id: re.organizationId,
        exception_id: re.exceptionId,
        rule_pack_id: re.rulePackId,
        rule_binding_id: re.ruleBindingId,
        requirements_json: re.requirementsJson,
        blocking_json: re.blockingJson,
        is_satisfied: re.isSatisfied,
        evaluated_at: re.evaluatedAt,
        metadata: re.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.rule_evaluations = RULE_EVALUATIONS.length;

  // ─── contradictions ───
  await db
    .insert(schema.contradictions)
    .values(
      CONTRADICTIONS.map((c) => ({
        id: c.id,
        organization_id: c.organizationId,
        property_id: c.propertyId,
        exception_id: c.exceptionId,
        type: c.type,
        severity: c.severity,
        confidence: c.confidence,
        claim_a_id: stableId(c.claimASlug),
        claim_b_id: stableId(c.claimBSlug),
        description: c.description,
        resolution_status: 'open',
        metadata: {},
      })),
    )
    .onConflictDoNothing();
  inserted.contradictions = CONTRADICTIONS.length;

  // ─── audit_events ───
  await db
    .insert(schema.audit_events)
    .values(
      AUDIT_EVENTS.map((ae) => ({
        id: ae.id,
        organization_id: ae.organizationId,
        action: ae.action as never,
        entity_type: ae.entityType,
        entity_id: ae.entityId,
        related_kind: ae.relatedKind,
        related_id: ae.relatedId,
        actor_user_id: ae.actorUserId,
        is_system_actor: ae.isSystemActor,
        before_json: ae.beforeJson,
        after_json: ae.afterJson,
        detail: ae.detail,
        occurred_at: ae.occurredAt,
      })),
    )
    .onConflictDoNothing();
  inserted.audit_events = AUDIT_EVENTS.length;

  // ─── notifications ───
  await db
    .insert(schema.notifications)
    .values(
      NOTIFICATIONS.map((n) => ({
        id: n.id,
        organization_id: n.organizationId,
        exception_id: n.exceptionId,
        channel: n.channel,
        status: n.status,
        recipient_role: n.recipientRole,
        recipient_user_id: n.recipientUserId,
        recipient_address: n.recipientAddress,
        template_key: n.templateKey,
        payload_hash: n.payloadHash,
        payload: n.payload,
        sent_at: n.sentAt,
        delivered_at: n.deliveredAt,
        metadata: n.metadata,
      })),
    )
    .onConflictDoNothing();
  inserted.notifications = NOTIFICATIONS.length;

  // ─── post-fire legal hold scenario (optional) ───
  if (opts.postFire) {
    const propertyId = PROPERTIES[0]!.id;
    const counselUserId = USERS.find((u) => u.slug === 'usr_counsel')?.id ?? null;
    await db
      .insert(schema.legal_holds)
      .values({
        id: stableId('hold_post_fire_property'),
        organization_id: ORGANIZATIONS[0]!.id,
        name: 'Post-fire preservation hold — Cedar Heights',
        scope_type: 'property',
        scope_id: propertyId,
        reason: 'Post-fire preservation requested by Counsel; preserve all originals.',
        status: 'active',
        subjects: [{ kind: 'property', id: propertyId }],
        requested_by_user_id: counselUserId,
        issued_at: new Date(),
        effective_at: new Date(),
        metadata: { source: 'seed:post-fire' },
      })
      .onConflictDoNothing();
    inserted.legal_holds = 1;
  }

  return { inserted };
}

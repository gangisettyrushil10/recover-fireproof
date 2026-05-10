/**
 * All v1 REST routes for Fireproof. Registered as a single Fastify plugin.
 *
 * Endpoints (per PRD):
 *   POST /v1/auth/dev-login | GET /v1/auth/me
 *   GET  /v1/properties/:id/dashboard | /contradictions | /documents
 *   POST /v1/exceptions | GET /v1/exceptions | GET /v1/exceptions/:id
 *   POST /v1/exceptions/:id/transition | /evidence
 *   POST /v1/evidence/:id/validate
 *   POST /v1/rule-evaluations/run
 *   POST /v1/packets | GET /v1/packets | GET /v1/packets/:id | /download
 *   POST /v1/legal-holds | /v1/legal-holds/:id/release | /activate
 *   POST /v1/documents/:id/versions | GET /v1/documents/:id
 *   GET  /v1/audit-events
 *   GET  /v1/rule-packs
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@fireproof/db';
import {
  ExceptionTypeValues,
  PacketTypeValues,
  SeverityValues,
  validationFailed,
  notFound,
  type PacketType,
  type Severity,
  type ExceptionType,
} from '@fireproof/domain';
import { authenticate, requireAuth, signDevToken } from '../auth.js';
import { sendDomainError } from '../errors.js';
import { DomainError } from '@fireproof/domain';
import type { Database } from '@fireproof/db';
import type { ExceptionLifecycleService } from '../services/ExceptionLifecycleService.js';
import type { EvidenceValidationService } from '../services/EvidenceValidationService.js';
import type { RuleEvaluationService } from '../services/RuleEvaluationService.js';
import type { LegalHoldService } from '../services/LegalHoldService.js';
import type { DocumentService } from '../services/DocumentService.js';
import type { PacketService } from '../services/PacketService.js';
import type { AuditEventService } from '../services/AuditEventService.js';
import type { PropertyDashboardService } from '../services/PropertyDashboardService.js';
import type { IStorageAdapter } from '../storage/index.js';

export interface RouteServices {
  db: Database;
  storage: IStorageAdapter;
  audit: AuditEventService;
  exceptions: ExceptionLifecycleService;
  evidence: EvidenceValidationService;
  rules: RuleEvaluationService;
  packets: PacketService;
  legalHolds: LegalHoldService;
  documents: DocumentService;
  dashboard: PropertyDashboardService;
}

async function authCtx(req: FastifyRequest): Promise<{
  user_id: string;
  organization_id: string;
  role: string;
}> {
  await authenticate(req);
  if (!req.auth) throw new DomainError('FORBIDDEN', 'Authentication required');
  return req.auth as { user_id: string; organization_id: string; role: string };
}

export default async function registerRoutes(
  app: FastifyInstance,
  s: RouteServices,
): Promise<void> {
  // ─── AUTH ─────────────────────────────────────────────────────────────────
  app.post('/v1/auth/dev-login', async (req, reply) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const userRows = await s.db
      .select({ user: schema.users, org: schema.organizations })
      .from(schema.users)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.users.organization_id))
      .where(eq(schema.users.email, body.email))
      .limit(1);
    const found = userRows[0];
    if (!found) {
      return sendDomainError(reply, notFound('user', body.email));
    }
    const token = await signDevToken({
      user_id: found.user.id,
      organization_id: found.org.id,
      role: found.user.role as never,
    });
    return reply.send({
      token,
      user: {
        id: found.user.id,
        email: found.user.email,
        name: found.user.full_name,
        role: found.user.role,
        organization_id: found.org.id,
        organization_name: found.org.name,
      },
    });
  });

  app.get('/v1/auth/me', async (req, reply) => {
    const ctx = await authCtx(req);
    const userRows = await s.db
      .select({ user: schema.users, org: schema.organizations })
      .from(schema.users)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.users.organization_id))
      .where(eq(schema.users.id, ctx.user_id))
      .limit(1);
    const found = userRows[0];
    if (!found) return sendDomainError(reply, notFound('user', ctx.user_id));
    return reply.send({
      user: {
        id: found.user.id,
        email: found.user.email,
        name: found.user.full_name,
        role: found.user.role,
        organization_id: found.org.id,
        organization_name: found.org.name,
      },
    });
  });

  // ─── PROPERTIES ─────────────────────────────────────────────────────────
  app.get('/v1/properties', async (req, reply) => {
    const ctx = await authCtx(req);
    const items = await s.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.organization_id, ctx.organization_id))
      .orderBy(schema.properties.name);
    return reply.send({ items });
  });

  // ─── PROPERTY DASHBOARD ──────────────────────────────────────────────────
  app.get<{ Params: { propertyId: string } }>(
    '/v1/properties/:propertyId/dashboard',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const dash = await s.dashboard.load(ctx.organization_id, req.params.propertyId);
      return reply.send(dash);
    },
  );

  app.get<{ Params: { propertyId: string } }>(
    '/v1/properties/:propertyId/contradictions',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const items = await s.db
        .select()
        .from(schema.contradictions)
        .where(
          and(
            eq(schema.contradictions.organization_id, ctx.organization_id),
            eq(schema.contradictions.property_id, req.params.propertyId),
          ),
        )
        .orderBy(desc(schema.contradictions.created_at));
      return reply.send({ items });
    },
  );

  app.get<{ Params: { propertyId: string } }>(
    '/v1/properties/:propertyId/documents',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const docs = await s.db
        .select()
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.organization_id, ctx.organization_id),
            eq(schema.documents.property_id, req.params.propertyId),
          ),
        )
        .orderBy(desc(schema.documents.created_at));
      return reply.send({ items: docs });
    },
  );

  // ─── EXCEPTIONS ──────────────────────────────────────────────────────────
  app.get('/v1/exceptions', async (req, reply) => {
    const ctx = await authCtx(req);
    const q = z
      .object({
        property_id: z.string().uuid().optional(),
        type: z.enum(ExceptionTypeValues).optional(),
        severity: z.enum(SeverityValues).optional(),
        open_only: z.coerce.boolean().optional(),
      })
      .parse(req.query);
    const items = await s.exceptions.listAll(ctx.organization_id, q);
    return reply.send({
      items: q.open_only ? items.filter((e) => !e.closed_at) : items,
      pagination: { total: items.length, limit: items.length, offset: 0 },
    });
  });

  app.get<{ Params: { id: string } }>('/v1/exceptions/:id', async (req, reply) => {
    const ctx = await authCtx(req);
    const ex = await s.exceptions.get(ctx.organization_id, req.params.id);
    const evidence = await s.db
      .select()
      .from(schema.evidence_items)
      .where(eq(schema.evidence_items.exception_id, ex.id))
      .orderBy(schema.evidence_items.evidence_type);
    const latest_evaluation = (await s.rules.getLatest(ctx.organization_id, ex.id)) ?? null;
    return reply.send({ exception: ex, evidence, latest_evaluation });
  });

  app.post('/v1/exceptions', async (req, reply) => {
    const ctx = await authCtx(req);
    const body = z
      .object({
        property_id: z.string().uuid(),
        type: z.enum(ExceptionTypeValues),
        title: z.string().min(1),
        severity: z.enum(SeverityValues),
        system_id: z.string().uuid().nullable().optional(),
        asset_id: z.string().uuid().nullable().optional(),
        jurisdiction_id: z.string().uuid().nullable().optional(),
        rule_pack_id: z.string().uuid().nullable().optional(),
        summary: z.string().nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const created = await s.exceptions.create({
      organization_id: ctx.organization_id,
      property_id: body.property_id,
      type: body.type as ExceptionType,
      title: body.title,
      severity: body.severity as Severity,
      system_id: body.system_id ?? null,
      asset_id: body.asset_id ?? null,
      jurisdiction_id: body.jurisdiction_id ?? null,
      rule_pack_id: body.rule_pack_id ?? null,
      summary: body.summary ?? null,
      reporter_user_id: ctx.user_id,
      metadata: body.metadata ?? {},
    });
    return reply.code(201).send(created);
  });

  app.post<{ Params: { id: string } }>(
    '/v1/exceptions/:id/transition',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const body = z
        .object({
          to_state: z.string().min(1),
          reason: z.string().nullable().optional(),
        })
        .parse(req.body);
      const updated = await s.exceptions.transition({
        organization_id: ctx.organization_id,
        exception_id: req.params.id,
        to_state: body.to_state,
        reason: body.reason ?? null,
        actor_user_id: ctx.user_id,
      });
      return reply.send(updated);
    },
  );

  app.post<{ Params: { id: string } }>('/v1/exceptions/:id/evidence', async (req, reply) => {
    const ctx = await authCtx(req);
    const body = z
      .object({
        evidence_type: z.string().min(1),
        payload: z.record(z.unknown()).default({}),
        document_version_ids: z.array(z.string().uuid()).optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(req.body);
    // upsert by (exception_id, evidence_type)
    const existing = await s.db
      .select()
      .from(schema.evidence_items)
      .where(
        and(
          eq(schema.evidence_items.exception_id, req.params.id),
          eq(
            schema.evidence_items.evidence_type,
            body.evidence_type as typeof schema.evidence_items.$inferSelect['evidence_type'],
          ),
        ),
      )
      .limit(1);

    let row: typeof schema.evidence_items.$inferSelect;
    if (existing[0]) {
      const [updated] = await s.db
        .update(schema.evidence_items)
        .set({
          payload: body.payload,
          document_version_ids: body.document_version_ids ?? [],
          notes: body.notes ?? null,
          updated_at: new Date(),
        })
        .where(eq(schema.evidence_items.id, existing[0].id))
        .returning();
      if (!updated) throw validationFailed('failed to update evidence_item');
      row = updated;
    } else {
      const [inserted] = await s.db
        .insert(schema.evidence_items)
        .values({
          organization_id: ctx.organization_id,
          exception_id: req.params.id,
          evidence_type:
            body.evidence_type as typeof schema.evidence_items.$inferInsert['evidence_type'],
          status: 'pending',
          payload: body.payload,
          document_version_ids: body.document_version_ids ?? [],
          notes: body.notes ?? null,
        })
        .returning();
      if (!inserted) throw validationFailed('failed to insert evidence_item');
      row = inserted;
    }

    // Validate immediately so the UI sees `valid` / `insufficient`.
    const validated = await s.evidence.validate(ctx.organization_id, row.id, ctx.user_id);
    return reply.send(validated);
  });

  app.post<{ Params: { id: string } }>('/v1/evidence/:id/validate', async (req, reply) => {
    const ctx = await authCtx(req);
    const validated = await s.evidence.validate(
      ctx.organization_id,
      req.params.id,
      ctx.user_id,
    );
    return reply.send(validated);
  });

  // ─── RULE EVALUATIONS ────────────────────────────────────────────────────
  app.post('/v1/rule-evaluations/run', async (req, reply) => {
    const ctx = await authCtx(req);
    const body = z.object({ exception_id: z.string().uuid() }).parse(req.body);
    const evaluated = await s.rules.run(ctx.organization_id, body.exception_id, ctx.user_id);
    return reply.send(evaluated);
  });

  // ─── PACKETS ─────────────────────────────────────────────────────────────
  app.get('/v1/packets', async (req, reply) => {
    const ctx = await authCtx(req);
    const q = z.object({ property_id: z.string().uuid().optional() }).parse(req.query);
    const items = await s.packets.list(ctx.organization_id, q);
    return reply.send({
      items,
      pagination: { total: items.length, limit: items.length, offset: 0 },
    });
  });

  app.post('/v1/packets', async (req, reply) => {
    const ctx = await authCtx(req);
    const body = z
      .object({
        property_id: z.string().uuid().nullable().optional(),
        exception_id: z.string().uuid().nullable().optional(),
        packet_type: z.enum(PacketTypeValues),
        title: z.string().min(1),
      })
      .parse(req.body);
    const created = await s.packets.create({
      organization_id: ctx.organization_id,
      property_id: body.property_id ?? null,
      exception_id: body.exception_id ?? null,
      packet_type: body.packet_type as PacketType,
      title: body.title,
      generated_by_user_id: ctx.user_id,
      generated_by_role: ctx.role as never,
    });
    return reply.code(201).send(created);
  });

  app.get<{ Params: { id: string } }>('/v1/packets/:id', async (req, reply) => {
    const ctx = await authCtx(req);
    const result = await s.packets.get(ctx.organization_id, req.params.id);
    return reply.send(result);
  });

  app.get<{ Params: { id: string } }>('/v1/packets/:id/download', async (req, reply) => {
    const ctx = await authCtx(req);
    const { packet, bytes } = await s.packets.download(ctx.organization_id, req.params.id);
    void reply
      .type('application/zip')
      .header(
        'Content-Disposition',
        `attachment; filename="packet-${packet.id}.zip"`,
      );
    return reply.send(bytes);
  });

  // ─── LEGAL HOLDS ─────────────────────────────────────────────────────────
  app.post('/v1/legal-holds', async (req, reply) => {
    const ctx = await authCtx(req);
    const body = z
      .object({
        scope_type: z.enum(['property', 'exception', 'packet', 'document', 'document_version']),
        scope_id: z.string().uuid(),
        reason: z.string().min(1),
        name: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const hold = await s.legalHolds.create({
      organization_id: ctx.organization_id,
      scope_type: body.scope_type,
      scope_id: body.scope_id,
      reason: body.reason,
      requested_by_user_id: ctx.user_id,
      name: body.name,
      metadata: body.metadata,
    });
    return reply.code(201).send(hold);
  });

  app.post<{ Params: { id: string } }>(
    '/v1/legal-holds/:id/release',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const body = z.object({ reason: z.string().min(1) }).parse(req.body);
      const hold = await s.legalHolds.release(
        req.params.id,
        ctx.organization_id,
        ctx.user_id,
        body.reason,
      );
      return reply.send(hold);
    },
  );

  app.get('/v1/legal-holds', async (req, reply) => {
    const ctx = await authCtx(req);
    const q = z
      .object({
        scope_type: z.string().optional(),
        scope_id: z.string().optional(),
      })
      .parse(req.query);
    const items = await s.legalHolds.list(ctx.organization_id, q);
    return reply.send({
      items,
      pagination: { total: items.length, limit: items.length, offset: 0 },
    });
  });

  // ─── DOCUMENTS ───────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/v1/documents/:id', async (req, reply) => {
    const ctx = await authCtx(req);
    const r = await s.documents.getDocument(ctx.organization_id, req.params.id);
    return reply.send(r);
  });

  app.post<{ Params: { id: string } }>(
    '/v1/documents/:id/versions',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const body = z
        .object({
          base64: z.string().min(1),
          mime_type: z.string().min(1),
          is_original: z.boolean().optional(),
          supersedes_version_id: z.string().uuid().nullable().optional(),
        })
        .parse(req.body);
      const bytes = Buffer.from(body.base64, 'base64');
      const created = await s.documents.createVersion({
        organization_id: ctx.organization_id,
        document_id: req.params.id,
        bytes,
        mime_type: body.mime_type,
        is_original: body.is_original,
        supersedes_version_id: body.supersedes_version_id ?? null,
        uploaded_by_user_id: ctx.user_id,
      });
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { documentId: string; versionId: string } }>(
    '/v1/documents/:documentId/versions/:versionId/download',
    async (req, reply) => {
      const ctx = await authCtx(req);
      const v = await s.documents.getVersion(
        ctx.organization_id,
        req.params.documentId,
        req.params.versionId,
      );
      const bytes = await s.storage.get(v.storage_key);
      void reply.type(v.mime_type ?? 'application/octet-stream');
      return reply.send(bytes);
    },
  );

  // ─── AUDIT EVENTS ────────────────────────────────────────────────────────
  app.get('/v1/audit-events', async (req, reply) => {
    const ctx = await authCtx(req);
    const q = z
      .object({
        entity_id: z.string().uuid().optional(),
        entity_type: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(100),
      })
      .parse(req.query);
    const where = [eq(schema.audit_events.organization_id, ctx.organization_id)];
    if (q.entity_id) where.push(eq(schema.audit_events.entity_id, q.entity_id));
    if (q.entity_type) where.push(eq(schema.audit_events.entity_type, q.entity_type));
    const items = await s.db
      .select()
      .from(schema.audit_events)
      .where(and(...where))
      .orderBy(desc(schema.audit_events.created_at))
      .limit(q.limit);
    return reply.send({
      items,
      pagination: { total: items.length, limit: q.limit, offset: 0 },
    });
  });

  // ─── RULE PACKS ──────────────────────────────────────────────────────────
  app.get('/v1/rule-packs', async (req, reply) => {
    const ctx = await authCtx(req);
    const items = await s.db
      .select()
      .from(schema.rule_packs)
      .where(eq(schema.rule_packs.organization_id, ctx.organization_id))
      .orderBy(desc(schema.rule_packs.created_at));
    return reply.send({ items });
  });
}

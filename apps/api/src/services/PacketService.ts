/**
 * PacketService — synchronous packet builder for MVP. Generates inline so the
 * demo flow doesn't require a worker process.
 */

import { and, desc, eq, inArray } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import {
  buildPacketBundle,
  type PacketBuildInput,
  type PacketManifestDocument,
} from '@fireproof/legal-export';
import type { PacketType, Severity, UserRole } from '@fireproof/domain';
import { notFound } from '@fireproof/domain';
import type { AuditEventService } from './AuditEventService.js';
import type { IStorageAdapter } from '../storage/index.js';

export interface CreatePacketInput {
  organization_id: string;
  property_id?: string | null;
  exception_id?: string | null;
  packet_type: PacketType;
  title: string;
  generated_by_user_id?: string | null;
  generated_by_role?: UserRole;
}

export class PacketService {
  constructor(
    private readonly db: Database,
    private readonly storage: IStorageAdapter,
    private readonly audit: AuditEventService,
  ) {}

  async create(input: CreatePacketInput): Promise<typeof schema.packets.$inferSelect> {
    const [row] = await this.db
      .insert(schema.packets)
      .values({
        organization_id: input.organization_id,
        property_id: input.property_id ?? null,
        exception_id: input.exception_id ?? null,
        packet_type: input.packet_type,
        title: input.title,
        status: 'draft',
        manifest_json: {},
        generated_by_user_id: input.generated_by_user_id ?? null,
      })
      .returning();
    if (!row) throw new Error('PacketService.create: insert returned no rows');

    await this.audit.log({
      organization_id: input.organization_id,
      action: 'packet.created',
      entity_type: 'packet',
      entity_id: row.id,
      actor_user_id: input.generated_by_user_id ?? null,
      detail: { packet_type: input.packet_type, title: input.title },
    });

    return await this.generate(
      row.id,
      input.organization_id,
      input.generated_by_user_id ?? null,
      input.generated_by_role ?? 'office',
    );
  }

  async generate(
    packet_id: string,
    organization_id: string,
    actor_user_id: string | null,
    actor_role: UserRole,
  ): Promise<typeof schema.packets.$inferSelect> {
    const rows = await this.db
      .select()
      .from(schema.packets)
      .where(
        and(
          eq(schema.packets.id, packet_id),
          eq(schema.packets.organization_id, organization_id),
        ),
      )
      .limit(1);
    const packet = rows[0];
    if (!packet) throw notFound('packet', packet_id);

    const exceptions = packet.property_id
      ? await this.db
          .select()
          .from(schema.exceptions)
          .where(
            and(
              eq(schema.exceptions.organization_id, organization_id),
              eq(schema.exceptions.property_id, packet.property_id),
            ),
          )
      : packet.exception_id
        ? await this.db
            .select()
            .from(schema.exceptions)
            .where(eq(schema.exceptions.id, packet.exception_id))
        : [];

    const exceptionIds = exceptions.map((e) => e.id);

    const documents = packet.property_id
      ? await this.db
          .select()
          .from(schema.documents)
          .where(
            and(
              eq(schema.documents.organization_id, organization_id),
              eq(schema.documents.property_id, packet.property_id),
            ),
          )
      : exceptionIds.length > 0
        ? await this.db
            .select()
            .from(schema.documents)
            .where(inArray(schema.documents.exception_id, exceptionIds))
        : [];

    const documentIds = documents.map((d) => d.id);
    const versions = documentIds.length
      ? await this.db
          .select()
          .from(schema.document_versions)
          .where(inArray(schema.document_versions.document_id, documentIds))
          .orderBy(desc(schema.document_versions.version_no))
      : [];

    const contradictions = packet.property_id
      ? await this.db
          .select()
          .from(schema.contradictions)
          .where(eq(schema.contradictions.property_id, packet.property_id))
      : [];

    const audit_events = packet.property_id
      ? await this.db
          .select()
          .from(schema.audit_events)
          .where(eq(schema.audit_events.organization_id, organization_id))
          .orderBy(desc(schema.audit_events.created_at))
          .limit(200)
      : [];

    const holdRows = packet.property_id
      ? await this.db
          .select()
          .from(schema.legal_holds)
          .where(
            and(
              eq(schema.legal_holds.organization_id, organization_id),
              eq(schema.legal_holds.scope_id, packet.property_id),
              eq(schema.legal_holds.status, 'active'),
            ),
          )
      : [];

    const docDocuments: PacketManifestDocument[] = versions.map((v, i) => {
      const d = documents.find((doc) => doc.id === v.document_id);
      return {
        document_version_id: v.id as PacketManifestDocument['document_version_id'],
        document_id: v.document_id as PacketManifestDocument['document_id'],
        version_no: v.version_no,
        sha256: v.sha256 as PacketManifestDocument['sha256'],
        mime_type: v.mime_type ?? 'application/octet-stream',
        byte_size: v.byte_size ?? 0,
        is_original: v.is_original,
        hold_status: holdRows.length > 0 ? 'active' : 'none',
        included_as: v.is_original ? 'original' : 'derivative',
        order_index: i,
        source_type: (d?.source_type ?? 'other') as PacketManifestDocument['source_type'],
        title: d?.title ?? 'Untitled',
        document_date: d?.document_date ? d.document_date.toISOString() : null,
      };
    });

    const buildInput: PacketBuildInput = {
      packet_id: packet.id as PacketBuildInput['packet_id'],
      packet_type: packet.packet_type as PacketType,
      property_id: (packet.property_id ?? '') as PacketBuildInput['property_id'],
      generated_at: new Date().toISOString(),
      generated_by: {
        user_id: (actor_user_id ?? 'system') as PacketBuildInput['generated_by']['user_id'],
        role: actor_role,
        organization_id: organization_id as PacketBuildInput['generated_by']['organization_id'],
      },
      legal_hold_active: holdRows.length > 0,
      exceptions: exceptions.map((e) => ({
        exception_id: e.id as PacketBuildInput['exceptions'][number]['exception_id'],
        type: e.type as PacketBuildInput['exceptions'][number]['type'],
        state: e.state,
        severity: e.severity as Severity,
        opened_at: (e.opened_at ?? new Date()).toISOString(),
        closed_at: e.closed_at ? e.closed_at.toISOString() : null,
        title: e.title,
      })),
      contradictions: contradictions.map((c) => ({
        id: c.id,
        type: 'omitted_known_deficiency',
        severity: c.severity as Severity,
        confidence: Number(c.confidence ?? 0.5),
      })),
      documents: docDocuments.map((d) => {
        const v = versions.find((vv) => vv.id === d.document_version_id);
        return {
          ...d,
          storage_key: v?.storage_key ?? '',
        };
      }),
      holds: holdRows.map((h) => ({
        id: h.id as never,
        organization_id: h.organization_id as never,
        scope_kind: 'property' as never,
        scope_id: (h.scope_id ?? '') as never,
        status: h.status as never,
        reason: h.reason,
        subjects: (h.subjects as Array<{ kind: string; id: string }>) ?? [],
        issued_at: h.issued_at ? h.issued_at.toISOString() : null,
        released_at: h.released_at ? h.released_at.toISOString() : null,
        released_by_user_id: h.released_by_user_id as never,
        release_reason: h.release_reason ?? null,
        metadata: (h.metadata as Record<string, unknown>) ?? {},
        created_at: h.created_at.toISOString() as never,
        updated_at: h.updated_at.toISOString() as never,
      })),
      audit: { events: audit_events },
    };

    const fetchBytes = async (storage_key: string): Promise<Buffer> => {
      try {
        return await this.storage.get(storage_key);
      } catch {
        return Buffer.from(`[missing blob ${storage_key}]`, 'utf8');
      }
    };

    const bundle = await buildPacketBundle(buildInput, fetchBytes);
    const zipPut = await this.storage.put(bundle.zipBuffer, { failIfExists: false });

    if (versions.length > 0) {
      await this.db
        .delete(schema.packet_items)
        .where(eq(schema.packet_items.packet_id, packet.id));
      await this.db.insert(schema.packet_items).values(
        versions.map((v, i) => ({
          organization_id,
          packet_id: packet.id,
          kind: 'document_version' as const,
          document_version_id: v.id,
          included_as: v.is_original ? 'original' : 'derivative',
          order_index: i,
        })),
      );
    }

    const [updated] = await this.db
      .update(schema.packets)
      .set({
        status: 'ready',
        artifact_storage_key: zipPut.storage_key,
        manifest_json: bundle.manifestJsonBuffer.toString('utf8')
          ? JSON.parse(bundle.manifestJsonBuffer.toString('utf8'))
          : {},
        generated_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.packets.id, packet.id))
      .returning();
    if (!updated) throw new Error('PacketService.generate: update returned no rows');

    await this.audit.log({
      organization_id,
      action: 'packet.emitted',
      entity_type: 'packet',
      entity_id: packet.id,
      actor_user_id,
      detail: {
        artifact_storage_key: zipPut.storage_key,
        sha256: zipPut.sha256,
        byte_size: zipPut.byte_size,
        manifest_sha256: bundle.manifestSha256,
        document_count: versions.length,
      },
    });
    return updated;
  }

  async get(
    organization_id: string,
    id: string,
  ): Promise<{
    packet: typeof schema.packets.$inferSelect;
    items: (typeof schema.packet_items.$inferSelect)[];
  }> {
    const rows = await this.db
      .select()
      .from(schema.packets)
      .where(
        and(eq(schema.packets.id, id), eq(schema.packets.organization_id, organization_id)),
      )
      .limit(1);
    const packet = rows[0];
    if (!packet) throw notFound('packet', id);
    const items = await this.db
      .select()
      .from(schema.packet_items)
      .where(eq(schema.packet_items.packet_id, id))
      .orderBy(schema.packet_items.order_index);
    return { packet, items };
  }

  async list(
    organization_id: string,
    filters: { property_id?: string },
  ): Promise<(typeof schema.packets.$inferSelect)[]> {
    const where = [eq(schema.packets.organization_id, organization_id)];
    if (filters.property_id)
      where.push(eq(schema.packets.property_id, filters.property_id));
    return this.db
      .select()
      .from(schema.packets)
      .where(and(...where))
      .orderBy(desc(schema.packets.created_at));
  }

  async download(
    organization_id: string,
    id: string,
  ): Promise<{ packet: typeof schema.packets.$inferSelect; bytes: Buffer }> {
    const { packet } = await this.get(organization_id, id);
    if (!packet.artifact_storage_key) {
      throw notFound('packet_artifact', id);
    }
    const bytes = await this.storage.get(packet.artifact_storage_key);
    return { packet, bytes };
  }
}

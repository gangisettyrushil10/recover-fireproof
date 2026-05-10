/**
 * DocumentService — append-only document version writes.
 *
 *   - Computes SHA-256, writes via storage adapter.
 *   - First version (or explicitly-flagged) becomes `is_original = true`.
 *   - Refuses to overwrite an original under an active legal hold.
 */

import { and, desc, eq } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import {
  DomainError,
  DomainErrorCode,
  legalHoldActive,
  notFound,
} from '@fireproof/domain';
import type { AuditEventService } from './AuditEventService.js';
import type { LegalHoldService } from './LegalHoldService.js';
import type { IStorageAdapter } from '../storage/index.js';

export interface CreateDocumentInput {
  organization_id: string;
  property_id?: string | null;
  exception_id?: string | null;
  source_type: typeof schema.documents.$inferInsert['source_type'];
  title: string;
  description?: string | null;
  document_date?: Date | null;
  uploaded_by_user_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateVersionInput {
  organization_id: string;
  document_id: string;
  bytes: Buffer;
  mime_type: string;
  /** When omitted, the service computes: original iff no prior version. */
  is_original?: boolean;
  supersedes_version_id?: string | null;
  uploaded_by_user_id?: string | null;
  metadata?: Record<string, unknown>;
}

export class DocumentService {
  constructor(
    private readonly db: Database,
    private readonly storage: IStorageAdapter,
    private readonly legalHold: LegalHoldService,
    private readonly audit: AuditEventService,
  ) {}

  async createDocument(
    input: CreateDocumentInput,
  ): Promise<typeof schema.documents.$inferSelect> {
    const [row] = await this.db
      .insert(schema.documents)
      .values({
        organization_id: input.organization_id,
        property_id: input.property_id ?? null,
        exception_id: input.exception_id ?? null,
        source_type: input.source_type,
        title: input.title,
        description: input.description ?? null,
        document_date: input.document_date ?? null,
        uploaded_by_user_id: input.uploaded_by_user_id ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error('DocumentService.createDocument: insert returned no rows');

    await this.audit.log({
      organization_id: input.organization_id,
      action: 'document.created',
      entity_type: 'document',
      entity_id: row.id,
      actor_user_id: input.uploaded_by_user_id ?? null,
      detail: { source_type: input.source_type, title: input.title },
    });
    return row;
  }

  async createVersion(
    input: CreateVersionInput,
  ): Promise<typeof schema.document_versions.$inferSelect> {
    // Load document & check FK + same-tenant.
    const docs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, input.document_id),
          eq(schema.documents.organization_id, input.organization_id),
        ),
      )
      .limit(1);
    const doc = docs[0];
    if (!doc) throw notFound('document', input.document_id);

    // Determine version number + is_original.
    const prior = await this.db
      .select()
      .from(schema.document_versions)
      .where(eq(schema.document_versions.document_id, input.document_id))
      .orderBy(desc(schema.document_versions.version_no))
      .limit(1);
    const lastVersion = prior[0];
    const nextVersionNo = (lastVersion?.version_no ?? 0) + 1;
    const isOriginal = input.is_original ?? !lastVersion;

    // Hold check: if any prior version is_original AND scope under hold,
    // reject any further write that would supersede or overwrite originals.
    if (lastVersion) {
      const docHeld = await this.legalHold.isScopeUnderHold(
        input.organization_id,
        'document',
        doc.id,
      );
      const versionHeld = await this.legalHold.isScopeUnderHold(
        input.organization_id,
        'document_version',
        lastVersion.id,
      );
      if (docHeld || versionHeld) {
        // Allow appending non-original supplements only if explicitly
        // marked non-original AND not flagged as a supersession of an
        // original. Holds always block deletion/overwrite of originals.
        const wouldOverwriteOriginal =
          isOriginal && lastVersion.is_original;
        const wouldSupersedeOriginal =
          input.supersedes_version_id === lastVersion.id && lastVersion.is_original;
        if (wouldOverwriteOriginal || wouldSupersedeOriginal) {
          throw legalHoldActive('document', doc.id);
        }
      }
    }

    // Hash + write via storage adapter (WORM: refuse overwrite of originals).
    const put = await this.storage.put(input.bytes, { failIfExists: isOriginal });

    const [row] = await this.db
      .insert(schema.document_versions)
      .values({
        organization_id: input.organization_id,
        document_id: input.document_id,
        version_no: nextVersionNo,
        sha256: put.sha256,
        storage_key: put.storage_key,
        mime_type: input.mime_type,
        byte_size: put.byte_size,
        is_original: isOriginal,
        supersedes_version_id: input.supersedes_version_id ?? null,
        uploaded_by_user_id: input.uploaded_by_user_id ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row) throw new Error('DocumentService.createVersion: insert returned no rows');

    await this.audit.log({
      organization_id: input.organization_id,
      action: input.supersedes_version_id
        ? 'document_version.superseded'
        : 'document_version.created',
      entity_type: 'document_version',
      entity_id: row.id,
      related_kind: 'document',
      related_id: input.document_id,
      actor_user_id: input.uploaded_by_user_id ?? null,
      detail: {
        version_no: nextVersionNo,
        is_original: isOriginal,
        sha256: put.sha256,
        byte_size: put.byte_size,
      },
    });
    return row;
  }

  async getDocument(
    organization_id: string,
    id: string,
  ): Promise<{
    document: typeof schema.documents.$inferSelect;
    versions: (typeof schema.document_versions.$inferSelect)[];
  }> {
    const docs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.organization_id, organization_id),
        ),
      )
      .limit(1);
    const doc = docs[0];
    if (!doc) throw notFound('document', id);

    const versions = await this.db
      .select()
      .from(schema.document_versions)
      .where(eq(schema.document_versions.document_id, id))
      .orderBy(desc(schema.document_versions.version_no));
    return { document: doc, versions };
  }

  async getVersion(
    organization_id: string,
    document_id: string,
    version_id: string,
  ): Promise<typeof schema.document_versions.$inferSelect> {
    const rows = await this.db
      .select()
      .from(schema.document_versions)
      .where(
        and(
          eq(schema.document_versions.organization_id, organization_id),
          eq(schema.document_versions.document_id, document_id),
          eq(schema.document_versions.id, version_id),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw notFound('document_version', version_id);
    return row;
  }

  async deleteVersion(
    organization_id: string,
    document_id: string,
    version_id: string,
  ): Promise<void> {
    const v = await this.getVersion(organization_id, document_id, version_id);
    if (v.is_original) {
      throw new DomainError(
        DomainErrorCode.Forbidden,
        'Originals cannot be deleted; supersede with a new version instead.',
        { details: { version_id } },
      );
    }
    const docHeld = await this.legalHold.isScopeUnderHold(
      organization_id,
      'document',
      document_id,
    );
    const versionHeld = await this.legalHold.isScopeUnderHold(
      organization_id,
      'document_version',
      version_id,
    );
    if (docHeld || versionHeld) throw legalHoldActive('document', document_id);

    await this.db.delete(schema.document_versions).where(
      and(
        eq(schema.document_versions.id, version_id),
        eq(schema.document_versions.organization_id, organization_id),
      ),
    );
  }
}

/**
 * Worker → DB port.
 *
 * The worker depends on a small subset of DB operations. Rather than
 * importing Drizzle queries directly (and racing the backend agent), we
 * define an interface here that `@fireproof/db` (or a thin wrapper in
 * `apps/api`) implements. The worker is fully testable with an in-memory
 * fake.
 */

import type {
  Contradiction,
  DocumentClaim,
  ExceptionId,
  ExceptionType,
  HoldStatus,
  IsoDateTime,
  LegalHold,
  PacketId,
  PacketType,
  PropertyId,
  Severity,
  UserRole,
} from '@fireproof/domain/types';

export interface DbException {
  id: ExceptionId;
  property_id: PropertyId;
  type: ExceptionType;
  state: string;
  severity: Severity;
  opened_at: IsoDateTime;
  closed_at: IsoDateTime | null;
  title: string;
  metadata: Record<string, unknown>;
}

export interface DbDocumentVersionRow {
  document_version_id: string;
  document_id: string;
  version_no: number;
  sha256: string;
  byte_size: number;
  mime_type: string;
  is_original: boolean;
  hold_status: HoldStatus;
  storage_key: string;
  source_type:
    | 'report'
    | 'email'
    | 'photo'
    | 'audio'
    | 'voicemail'
    | 'log'
    | 'proposal'
    | 'certificate'
    | 'other';
  title: string;
  document_date: IsoDateTime | null;
}

export interface DbPacketRow {
  packet_id: PacketId;
  packet_type: PacketType;
  property_id: PropertyId;
  organization_id: string;
  requested_by_user_id: string;
  requested_by_role: UserRole;
  status: 'draft' | 'ready' | 'emitted' | 'archived';
}

export interface DbAuditEvent {
  id: string;
  occurred_at: IsoDateTime;
  action: string;
  subject_ref: { kind: string; id: string };
  detail: Record<string, unknown>;
}

export interface PacketDb {
  loadPacket(packet_id: string): Promise<DbPacketRow>;
  loadExceptionsForScope(args: {
    property_id: string;
    exception_ids?: string[];
  }): Promise<DbException[]>;
  loadDocumentVersionsForScope(args: {
    property_id: string;
    exception_ids?: string[];
  }): Promise<DbDocumentVersionRow[]>;
  loadAuditEventsForScope(args: {
    property_id: string;
    exception_ids?: string[];
  }): Promise<DbAuditEvent[]>;
  loadActiveHoldsForScope(args: { property_id: string }): Promise<LegalHold[]>;
  loadContradictionsForScope(args: {
    property_id: string;
    exception_ids?: string[];
  }): Promise<Contradiction[]>;
  /** Persist the manifest JSON + final status + insert packet_items rows. */
  finalizePacket(args: {
    packet_id: string;
    manifest_json: Record<string, unknown>;
    artifact_storage_key: string;
    items: Array<{
      document_version_id: string;
      kind: 'document_version';
      position: number;
      title: string;
    }>;
  }): Promise<void>;
}

export interface ContradictionsDb {
  loadClaimsForScope(args: {
    property_id?: string;
    exception_id?: string;
  }): Promise<DocumentClaim[]>;
  upsertContradictions(args: {
    organization_id: string;
    scope_property_id?: string;
    scope_exception_id?: string;
    detected: Array<{
      type: string;
      severity: Severity;
      confidence: number;
      claim_a_id: string;
      claim_b_id: string;
      description: string;
    }>;
  }): Promise<void>;
}

export interface NotificationsDb {
  markSent(args: { notification_id: string; sent_at: IsoDateTime }): Promise<void>;
  markFailed(args: {
    notification_id: string;
    failed_at: IsoDateTime;
    failure_reason: string;
  }): Promise<void>;
}

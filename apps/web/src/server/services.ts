/**
 * Per-cold-start singletons for the domain services. Each handler imports
 * these instead of constructing fresh services on every request.
 */

import 'server-only';
import { AuditEventService } from '@fireproof/api/services/audit';
import { EvidenceValidationService } from '@fireproof/api/services/evidence';
import { LegalHoldService } from '@fireproof/api/services/legal-holds';
import { DocumentService } from '@fireproof/api/services/documents';
import { ExceptionLifecycleService } from '@fireproof/api/services/exceptions';
import { RuleEvaluationService } from '@fireproof/api/services/rules';
import { PacketService } from '@fireproof/api/services/packets';
import { PropertyDashboardService } from '@fireproof/api/services/dashboard';
import { LocalFsStorageAdapter, type IStorageAdapter } from '@fireproof/api/storage';
import { getDb } from './db.js';

declare global {
  // eslint-disable-next-line no-var
  var __fireproofServices: ServiceBundle | undefined;
}

export interface ServiceBundle {
  storage: IStorageAdapter;
  audit: AuditEventService;
  legalHolds: LegalHoldService;
  documents: DocumentService;
  evidence: EvidenceValidationService;
  rules: RuleEvaluationService;
  exceptions: ExceptionLifecycleService;
  packets: PacketService;
  dashboard: PropertyDashboardService;
}

export function getServices(): ServiceBundle {
  if (global.__fireproofServices) return global.__fireproofServices;
  const { db } = getDb();
  const storageRoot = process.env.LOCAL_STORAGE_ROOT ?? '/tmp/fireproof-storage';
  const storage = new LocalFsStorageAdapter(storageRoot);
  const audit = new AuditEventService(db);
  const legalHolds = new LegalHoldService(db, audit);
  const documents = new DocumentService(db, storage, legalHolds, audit);
  const evidence = new EvidenceValidationService(db, audit);
  const rules = new RuleEvaluationService(db, audit, null);
  const exceptions = new ExceptionLifecycleService(db, audit, evidence, rules);
  const packets = new PacketService(db, storage, audit);
  const dashboard = new PropertyDashboardService(db);
  const bundle: ServiceBundle = {
    storage,
    audit,
    legalHolds,
    documents,
    evidence,
    rules,
    exceptions,
    packets,
    dashboard,
  };
  global.__fireproofServices = bundle;
  return bundle;
}

/**
 * Fastify bootstrap. Wires plugins, services, and routes; mounts /v1.
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { DomainError } from '@fireproof/domain';
import { closeDb, getDb } from './db.js';
import { getStorageAdapter } from './storage/index.js';
import { sendDomainError } from './errors.js';
import { getConfig } from './config.js';
import { AuditEventService } from './services/AuditEventService.js';
import { EvidenceValidationService } from './services/EvidenceValidationService.js';
import { LegalHoldService } from './services/LegalHoldService.js';
import { DocumentService } from './services/DocumentService.js';
import { ExceptionLifecycleService } from './services/ExceptionLifecycleService.js';
import { RuleEvaluationService } from './services/RuleEvaluationService.js';
import { PacketService } from './services/PacketService.js';
import { PropertyDashboardService } from './services/PropertyDashboardService.js';
import registerRoutes from './routes/index.js';

export async function buildServer() {
  const cfg = getConfig();
  const app = Fastify({
    logger: { level: cfg.logLevel },
    bodyLimit: 25 * 1024 * 1024,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
    genReqId: () =>
      'req_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: [
      'authorization',
      'content-type',
      'x-fireproof-user',
      'x-fireproof-organization',
      'x-fireproof-role',
      'x-request-id',
    ],
  });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  const dbHandle = getDb();
  const storage = getStorageAdapter();

  const audit = new AuditEventService(dbHandle.db);
  const legalHolds = new LegalHoldService(dbHandle.db, audit);
  const documents = new DocumentService(dbHandle.db, storage, legalHolds, audit);
  const evidence = new EvidenceValidationService(dbHandle.db, audit);
  const rules = new RuleEvaluationService(dbHandle.db, audit, null);
  const exceptions = new ExceptionLifecycleService(dbHandle.db, audit, evidence, rules);
  const packets = new PacketService(dbHandle.db, storage, audit);
  const dashboard = new PropertyDashboardService(dbHandle.db);

  app.get('/healthz', async () => ({ ok: true, ts: new Date().toISOString() }));

  await registerRoutes(app, {
    db: dbHandle.db,
    storage,
    audit,
    exceptions,
    evidence,
    rules,
    packets,
    legalHolds,
    documents,
    dashboard,
  });

  app.setErrorHandler((err, _req, reply) => {
    if (DomainError.is(err)) return sendDomainError(reply, err);
    if ((err as { validation?: unknown }).validation) {
      return reply.code(400).send({
        code: 'VALIDATION_FAILED',
        message: err.message,
        details: { validation: (err as { validation?: unknown }).validation },
      });
    }
    reply.log.error({ err }, 'unhandled error');
    return reply.code(500).send({
      code: 'INTERNAL_ERROR',
      message: err.message,
      details: {},
    });
  });

  app.addHook('onClose', async () => {
    await closeDb();
  });

  return app;
}

async function main(): Promise<void> {
  const cfg = getConfig();
  const app = await buildServer();
  try {
    await app.listen({ host: '0.0.0.0', port: cfg.port });
    app.log.info(`Fireproof API listening on :${cfg.port}`);
  } catch (err) {
    app.log.error(err, 'failed to start server');
    process.exit(1);
  }
}

const isEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined;
if (isEntry) {
  void main();
}

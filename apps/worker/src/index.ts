/**
 * Fireproof worker entrypoint. Boots BullMQ workers for packets,
 * contradictions, notifications, and evidence validation.
 *
 * In MVP, the API also generates packets synchronously — the worker is here
 * for future scaling. Run with: `pnpm --filter @fireproof/worker dev`.
 */

import 'dotenv/config';
import { Worker, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger.js';
import {
  QUEUE_NAMES,
  type ContradictionsJobPayload,
  type EvidenceValidationJobPayload,
  type NotificationsJobPayload,
} from './queue.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection: ConnectionOptions = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const workers: Worker[] = [];

// ─── Notifications worker (stub for MVP) ───────────────────────────────────
workers.push(
  new Worker<NotificationsJobPayload>(
    QUEUE_NAMES.notifications,
    async (job) => {
      logger.info(
        { jobId: job.id, payload: job.data },
        'notification.dispatch (stub — replace with provider call in production)',
      );
      return { dispatched: true, channel: job.data.channel };
    },
    { connection },
  ),
);

// ─── Contradictions worker (stub — re-runs detection on demand) ────────────
workers.push(
  new Worker<ContradictionsJobPayload>(
    QUEUE_NAMES.contradictions,
    async (job) => {
      logger.info(
        { jobId: job.id, scope: job.data.scope },
        'contradictions.detect (stub — backend already seeds contradictions)',
      );
      return { detected: 0 };
    },
    { connection },
  ),
);

// ─── Evidence validation worker (calls API back) ───────────────────────────
workers.push(
  new Worker<EvidenceValidationJobPayload>(
    QUEUE_NAMES.evidenceValidation,
    async (job) => {
      const { api_base_url, service_token, evidence_item_id } = job.data;
      const url = `${api_base_url.replace(/\/$/, '')}/v1/evidence/${evidence_item_id}/validate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${service_token}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`evidence validation failed: ${res.status} ${text}`);
      }
      return { ok: true };
    },
    { connection },
  ),
);

// ─── Packet worker — heavy job; MVP API can also generate inline ───────────
// We import the full packet worker lazily so a missing storage adapter or DB
// port doesn't prevent the lighter workers from booting in CI.
async function startPacketWorker(): Promise<void> {
  try {
    const { createPacketWorker } = await import('./workers/packetWorker.js');
    // Storage and DB ports for packet generation are intentionally lazy —
    // the MVP demo runs packet generation through the API. If you need the
    // worker to take packet jobs, wire up real adapters here.
    logger.info('packet worker not started — using inline API generation in MVP');
    void createPacketWorker;
  } catch (err) {
    logger.warn({ err }, 'packet worker import failed; continuing without it');
  }
}

void startPacketWorker();

logger.info(
  { redisUrl, queues: Object.values(QUEUE_NAMES) },
  'Fireproof worker started',
);

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down workers');
  for (const w of workers) {
    try {
      await w.close();
    } catch (err) {
      logger.warn({ err }, 'worker close failed');
    }
  }
  try {
    if ('quit' in connection && typeof (connection as IORedis).quit === 'function') {
      await (connection as IORedis).quit();
    }
  } catch {
    // ignore
  }
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

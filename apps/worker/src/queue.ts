/**
 * Shared queue factory + typed enqueue helpers.
 *
 * The API imports these too (workspace dep) so that producers and consumers
 * agree on names and payload shapes. BullMQ + Redis under the hood.
 */

import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';

export const QUEUE_NAMES = {
  packets: 'packets',
  contradictions: 'contradictions',
  notifications: 'notifications',
  evidenceValidation: 'evidence-validation',
} as const;

// ─── Typed payloads ────────────────────────────────────────────────────────

export interface PacketJobPayload {
  packet_id: string;
  packet_type:
    | 'AHJ_NOV_RESPONSE'
    | 'OWNER_RESPONSE'
    | 'INSURER_LOSS_CONTROL'
    | 'COUNSEL_SUBROGATION';
  property_id: string;
  exception_ids?: string[];
  organization_id: string;
  requested_by_user_id: string;
}

export interface ContradictionsJobPayload {
  organization_id: string;
  scope:
    | { kind: 'property'; id: string }
    | { kind: 'exception'; id: string };
}

export interface NotificationsJobPayload {
  organization_id: string;
  notification_id: string;
  channel: 'email' | 'sms' | 'in_app' | 'webhook';
  recipient_address: string;
  template_key: string;
  payload: Record<string, unknown>;
}

export interface EvidenceValidationJobPayload {
  organization_id: string;
  evidence_item_id: string;
  /** API base URL (e.g. http://localhost:3000) — supplied by the API at enqueue time. */
  api_base_url: string;
  /** Service token the API issues for worker-to-API calls. */
  service_token: string;
}

export interface QueueRegistry {
  packets: Queue<PacketJobPayload>;
  contradictions: Queue<ContradictionsJobPayload>;
  notifications: Queue<NotificationsJobPayload>;
  evidenceValidation: Queue<EvidenceValidationJobPayload>;
}

export interface QueueFactoryOptions {
  connection: ConnectionOptions;
  defaultJobOptions?: JobsOptions;
}

const SAFE_JOB_DEFAULTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
};

export function createQueueRegistry(options: QueueFactoryOptions): QueueRegistry {
  const defaultJobOptions = { ...SAFE_JOB_DEFAULTS, ...options.defaultJobOptions };
  return {
    packets: new Queue(QUEUE_NAMES.packets, {
      connection: options.connection,
      defaultJobOptions,
    }),
    contradictions: new Queue(QUEUE_NAMES.contradictions, {
      connection: options.connection,
      defaultJobOptions,
    }),
    notifications: new Queue(QUEUE_NAMES.notifications, {
      connection: options.connection,
      defaultJobOptions,
    }),
    evidenceValidation: new Queue(QUEUE_NAMES.evidenceValidation, {
      connection: options.connection,
      defaultJobOptions,
    }),
  };
}

/**
 * Typed enqueue helpers. The API layer imports these instead of touching
 * BullMQ directly.
 */
export const enqueue = {
  packet(registry: QueueRegistry, payload: PacketJobPayload, opts?: JobsOptions) {
    return registry.packets.add(`packet:${payload.packet_id}`, payload, opts);
  },
  contradictions(
    registry: QueueRegistry,
    payload: ContradictionsJobPayload,
    opts?: JobsOptions,
  ) {
    return registry.contradictions.add(
      `contradictions:${payload.scope.kind}:${payload.scope.id}`,
      payload,
      opts,
    );
  },
  notification(
    registry: QueueRegistry,
    payload: NotificationsJobPayload,
    opts?: JobsOptions,
  ) {
    return registry.notifications.add(
      `notification:${payload.notification_id}`,
      payload,
      opts,
    );
  },
  evidenceValidation(
    registry: QueueRegistry,
    payload: EvidenceValidationJobPayload,
    opts?: JobsOptions,
  ) {
    return registry.evidenceValidation.add(
      `evidence:${payload.evidence_item_id}`,
      payload,
      opts,
    );
  },
};

export async function closeRegistry(registry: QueueRegistry): Promise<void> {
  await Promise.all([
    registry.packets.close(),
    registry.contradictions.close(),
    registry.notifications.close(),
    registry.evidenceValidation.close(),
  ]);
}

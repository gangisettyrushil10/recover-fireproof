/**
 * Offline outbox.
 *
 * Mutating API requests issued while offline are persisted in IndexedDB
 * (via `idb-keyval`) under a single `OUTBOX_KEY` array. A periodic flush
 * runs every 30s when `navigator.onLine` is true; the `online` event also
 * triggers a flush. Photos are stored as `Blob`s and sent via FormData.
 *
 * The outbox is intentionally tiny — keep it dumb and serialisable.
 */

import { get, set, del } from 'idb-keyval';

import { apiClient, ApiError, getAuthToken } from './api.js';

const OUTBOX_KEY = 'fireproof:outbox:v1';
const DRAFT_PREFIX = 'fireproof:draft:';

export type OutboxAction =
  | {
      kind: 'json';
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      url: string;
      body?: unknown;
      label?: string;
    }
  | {
      kind: 'form';
      method: 'POST' | 'PUT';
      url: string;
      /** Multipart form; files are stored as Blobs. */
      fields: Array<{ name: string; value: string }>;
      files?: Array<{ name: string; blob: Blob; filename: string }>;
      label?: string;
    };

export interface OutboxItem {
  id: string;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
  action: OutboxAction;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<OutboxItem[]> {
  const raw = await get<OutboxItem[]>(OUTBOX_KEY);
  return Array.isArray(raw) ? raw : [];
}

async function writeQueue(items: OutboxItem[]): Promise<void> {
  if (items.length === 0) {
    await del(OUTBOX_KEY);
    return;
  }
  await set(OUTBOX_KEY, items);
}

export async function enqueue(action: OutboxAction): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: uid(),
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    action,
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  notifyChange(queue.length);
  return item;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return readQueue();
}

export async function clearOutbox(): Promise<void> {
  await writeQueue([]);
  notifyChange(0);
}

export async function removeFromOutbox(id: string): Promise<void> {
  const queue = await readQueue();
  const next = queue.filter((q) => q.id !== id);
  await writeQueue(next);
  notifyChange(next.length);
}

async function executeAction(action: OutboxAction): Promise<void> {
  if (action.kind === 'json') {
    await apiClient.request(action.url, {
      method: action.method,
      json: action.body,
    });
    return;
  }

  const fd = new FormData();
  for (const f of action.fields) fd.append(f.name, f.value);
  for (const file of action.files ?? []) {
    fd.append(file.name, file.blob, file.filename);
  }
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(action.url.startsWith('http') ? action.url : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${action.url}`, {
    method: action.method,
    body: fd,
    headers,
  });
  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body);
  }
}

export interface FlushResult {
  attempted: number;
  succeeded: number;
  remaining: number;
}

let flushing = false;

export async function flushOutbox(): Promise<FlushResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const queue = await readQueue();
    return { attempted: 0, succeeded: 0, remaining: queue.length };
  }
  if (flushing) {
    const queue = await readQueue();
    return { attempted: 0, succeeded: 0, remaining: queue.length };
  }
  flushing = true;
  try {
    const queue = await readQueue();
    const remaining: OutboxItem[] = [];
    let succeeded = 0;
    for (const item of queue) {
      try {
        await executeAction(item.action);
        succeeded += 1;
      } catch (err) {
        remaining.push({
          ...item,
          attemptCount: item.attemptCount + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await writeQueue(remaining);
    notifyChange(remaining.length);
    return { attempted: queue.length, succeeded, remaining: remaining.length };
  } finally {
    flushing = false;
  }
}

// ─── Drafts (per-exception form state) ──────────────────────────────────────

export async function saveDraft<T>(scopeKey: string, value: T): Promise<void> {
  await set(`${DRAFT_PREFIX}${scopeKey}`, value);
}

export async function loadDraft<T>(scopeKey: string): Promise<T | null> {
  const v = await get<T>(`${DRAFT_PREFIX}${scopeKey}`);
  return v ?? null;
}

export async function clearDraft(scopeKey: string): Promise<void> {
  await del(`${DRAFT_PREFIX}${scopeKey}`);
}

// ─── Change notifications (for the AppShell badge) ──────────────────────────

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function notifyChange(count: number): void {
  for (const l of listeners) {
    try {
      l(count);
    } catch {
      /* ignore */
    }
  }
}

export function onOutboxChange(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

let started = false;

/**
 * Start the periodic flush + online-event flush. Idempotent. Safe to call
 * from the browser bootstrap (e.g., a layout effect).
 */
export function startOutboxLoop(intervalMs = 30_000): () => void {
  if (typeof window === 'undefined' || started) return () => {};
  started = true;

  const onOnline = () => {
    void flushOutbox();
  };
  window.addEventListener('online', onOnline);

  void flushOutbox();
  const handle = window.setInterval(() => {
    void flushOutbox();
  }, intervalMs);

  // Trigger a recount immediately for any subscribers.
  void readQueue().then((q) => notifyChange(q.length));

  return () => {
    window.removeEventListener('online', onOnline);
    window.clearInterval(handle);
    started = false;
  };
}

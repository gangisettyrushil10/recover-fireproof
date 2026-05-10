'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { AuditEvent } from '@fireproof/domain';
import { History, X } from 'lucide-react';
import { Skeleton } from './Skeleton.js';
import { cn } from '../lib/cn.js';

export interface AuditTrailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  events: AuditEvent[];
  loading?: boolean;
  emptyHint?: string;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AuditTrailDrawer({
  open,
  onOpenChange,
  title = 'Audit trail',
  events,
  loading,
  emptyHint = 'No events recorded yet for this entity.',
}: AuditTrailDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] shadow-xl',
          )}
        >
          <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[rgb(var(--color-fg-muted))]" />
              <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="rounded p-1 text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-bg-muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-[rgb(var(--color-fg-muted))]">{emptyHint}</p>
            ) : (
              <ol className="space-y-2">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))] p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] text-[rgb(var(--color-fg))]">
                        {e.action}
                      </span>
                      <time className="text-[11px] text-[rgb(var(--color-fg-muted))]">
                        {fmt(e.occurred_at)}
                      </time>
                    </div>
                    {Object.keys(e.detail ?? {}).length > 0 ? (
                      <pre className="mt-1 overflow-x-auto rounded bg-[rgb(var(--color-bg))] p-2 text-[10px] text-[rgb(var(--color-fg-muted))]">
                        {JSON.stringify(e.detail, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  type ExceptionType,
  allowedNextStates,
  type ImpairmentState,
  type DeficiencyState,
  type CarrierRecommendationState,
  type AssetIdentityState,
} from '@fireproof/domain';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './Button.js';
import { Textarea } from './Textarea.js';
import { cn } from '../lib/cn.js';

type AnyState =
  | ImpairmentState
  | DeficiencyState
  | CarrierRecommendationState
  | AssetIdentityState;

export interface TransitionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exceptionType: ExceptionType;
  currentState: AnyState;
  /** Optional list of unmet blocking requirement keys returned by the server (422). */
  serverError?: { code: string; missing?: string[]; message?: string } | null;
  onSubmit: (toState: AnyState, reason: string | null) => Promise<void> | void;
  submitting?: boolean;
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ');
}

export function TransitionDrawer({
  open,
  onOpenChange,
  exceptionType,
  currentState,
  serverError,
  onSubmit,
  submitting,
}: TransitionDrawerProps) {
  const next = useMemo(() => {
    return allowedNextStates(
      exceptionType,
      // The helper signature is generic; cast safely here.
      currentState as never,
    );
  }, [exceptionType, currentState]);

  const [selected, setSelected] = useState<AnyState | null>(null);
  const [reason, setReason] = useState('');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
          )}
        >
          <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Request transition</Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="rounded p-1 text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-bg-muted))]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="text-xs text-[rgb(var(--color-fg-muted))]">
              Currently in <span className="font-medium text-[rgb(var(--color-fg))]">{humanize(currentState)}</span>
              . Pick the next allowed state.
            </div>

            {next.length === 0 ? (
              <div className="rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))] p-3 text-xs text-[rgb(var(--color-fg-muted))]">
                No outbound transitions are allowed from this state.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {next.map((state) => (
                  <li key={state}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm hover:bg-[rgb(var(--color-bg-muted))]">
                      <input
                        type="radio"
                        name="to_state"
                        value={state}
                        checked={selected === (state as AnyState)}
                        onChange={() => setSelected(state as AnyState)}
                      />
                      <span className="font-medium">{humanize(state)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--color-fg-muted))]" htmlFor="transition-reason">
                Reason (optional)
              </label>
              <Textarea
                id="transition-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you making this change?"
              />
            </div>

            {serverError ? (
              <div
                role="alert"
                className="rounded-md border border-[rgb(var(--color-danger))]/40 bg-red-500/5 p-3 text-xs"
              >
                <p className="font-semibold text-[rgb(var(--color-danger))]">
                  {serverError.code === 'BLOCKING_REQUIREMENTS_UNMET'
                    ? 'Blocking requirements unmet'
                    : serverError.code}
                </p>
                {serverError.message ? (
                  <p className="mt-1 text-[rgb(var(--color-fg-muted))]">{serverError.message}</p>
                ) : null}
                {serverError.missing && serverError.missing.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 font-mono text-[11px] text-[rgb(var(--color-fg))]">
                    {serverError.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[rgb(var(--color-border))] px-4 py-3">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              disabled={!selected || submitting}
              onClick={async () => {
                if (!selected) return;
                await onSubmit(selected, reason.trim() ? reason.trim() : null);
              }}
            >
              {submitting ? 'Submitting…' : 'Request transition'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

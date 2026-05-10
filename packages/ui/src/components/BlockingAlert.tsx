'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface BlockingRequirement {
  /** Stable rule key, e.g., `ahj_notification.valid`. */
  key: string;
  /** Human-readable description for the row. */
  label: string;
  /** Optional anchor id of the form to scroll to when the user clicks "Fix". */
  fixTargetId?: string;
}

export interface BlockingAlertProps {
  blockers: BlockingRequirement[];
  className?: string;
  onFix?: (blocker: BlockingRequirement) => void;
}

/**
 * Big red alert listing rule-required evidence that is missing or invalid.
 * Renders nothing when `blockers` is empty.
 */
export function BlockingAlert({ blockers, className, onFix }: BlockingAlertProps) {
  if (blockers.length === 0) return null;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-[rgb(var(--color-danger))]/40 bg-red-500/5 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[rgb(var(--color-danger))]" />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-danger))]">
              Cannot close yet — {blockers.length} blocking requirement{blockers.length === 1 ? '' : 's'} unmet.
            </p>
            <p className="text-xs text-[rgb(var(--color-fg-muted))]">
              These items are required by the active rule pack before this exception can move to closed.
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {blockers.map((b) => (
              <li
                key={b.key}
                className="flex items-center justify-between gap-3 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[rgb(var(--color-fg))]">{b.label}</p>
                  <p className="truncate font-mono text-[11px] text-[rgb(var(--color-fg-muted))]">{b.key}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onFix) onFix(b);
                    if (b.fixTargetId && typeof document !== 'undefined') {
                      document.getElementById(b.fixTargetId)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs font-medium text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-bg-muted))]"
                >
                  Fix
                  <ArrowRight className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

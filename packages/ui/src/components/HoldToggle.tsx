'use client';

import { Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button.js';
import { Textarea } from './Textarea.js';
import { Card, CardContent, CardHeader, CardTitle } from './Card.js';
import { cn } from '../lib/cn.js';

export interface HoldToggleProps {
  active: boolean;
  reason?: string;
  /** Whether the current viewer can toggle the hold (admin/legal). */
  canToggle: boolean;
  onActivate: (reason: string) => Promise<void> | void;
  onRelease: (reason: string) => Promise<void> | void;
  className?: string;
}

export function HoldToggle({
  active,
  reason,
  canToggle,
  onActivate,
  onRelease,
  className,
}: HoldToggleProps) {
  const [draftReason, setDraftReason] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <Card className={cn(className, active ? 'border-amber-500/40 bg-amber-500/5' : undefined)}>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {active ? (
            <Lock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          ) : (
            <Unlock className="h-4 w-4 text-[rgb(var(--color-fg-muted))]" />
          )}
          <CardTitle>Legal hold</CardTitle>
        </div>
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 text-xs font-medium',
            active
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg-muted))] text-[rgb(var(--color-fg-muted))]',
          )}
        >
          {active ? 'active' : 'none'}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {active && reason ? (
          <p className="text-xs text-[rgb(var(--color-fg-muted))]">
            <span className="font-medium text-[rgb(var(--color-fg))]">Reason on record:</span>{' '}
            {reason}
          </p>
        ) : null}

        {canToggle ? (
          <>
            <Textarea
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              placeholder={
                active
                  ? 'Reason for releasing the hold (required)…'
                  : 'Reason for activating the hold (required)…'
              }
            />
            <div className="flex justify-end">
              <Button
                disabled={!draftReason.trim() || pending}
                variant={active ? 'secondary' : 'primary'}
                onClick={async () => {
                  setPending(true);
                  try {
                    if (active) await onRelease(draftReason.trim());
                    else await onActivate(draftReason.trim());
                    setDraftReason('');
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {active ? 'Release hold' : 'Activate hold'}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-[rgb(var(--color-fg-muted))]">
            Only Counsel and Admin roles can toggle legal holds.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

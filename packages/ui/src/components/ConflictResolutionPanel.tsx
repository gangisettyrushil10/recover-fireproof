'use client';

import type { Severity } from '@fireproof/domain';
import { ArrowLeftRight, FileText } from 'lucide-react';
import { SeverityChip } from './SeverityChip.js';
import { cn } from '../lib/cn.js';

export interface ConflictClaim {
  id: string;
  sourceLabel: string;
  /** ISO datetime of the source. */
  sourceDate?: string;
  claimType: string;
  /** Display value (already serialised). */
  value: string;
  /** Optional excerpt. */
  excerpt?: string;
}

export interface ConflictResolutionPanelProps {
  description: string;
  severity: Severity;
  type: string;
  claimA: ConflictClaim;
  claimB: ConflictClaim;
  className?: string;
}

function fmt(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ConflictResolutionPanel({
  description,
  severity,
  type,
  claimA,
  claimB,
  className,
}: ConflictResolutionPanelProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{description}</p>
          <p className="font-mono text-[11px] text-[rgb(var(--color-fg-muted))]">{type}</p>
        </div>
        <SeverityChip severity={severity} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[1fr_auto_1fr]">
        <ClaimCard claim={claimA} />
        <div className="flex items-center justify-center text-[rgb(var(--color-fg-muted))]">
          <ArrowLeftRight className="h-4 w-4" />
        </div>
        <ClaimCard claim={claimB} />
      </div>
    </div>
  );
}

function ClaimCard({ claim }: { claim: ConflictClaim }) {
  return (
    <div className="rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))] p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--color-fg-muted))]" />
          <span className="truncate text-xs font-medium text-[rgb(var(--color-fg))]">
            {claim.sourceLabel}
          </span>
        </div>
        {claim.sourceDate ? (
          <time className="text-[10px] text-[rgb(var(--color-fg-muted))]">
            {fmt(claim.sourceDate)}
          </time>
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
          {claim.claimType}
        </p>
        <p className="font-medium text-[rgb(var(--color-fg))]">{claim.value}</p>
        {claim.excerpt ? (
          <blockquote className="border-l-2 border-[rgb(var(--color-border-strong))] pl-2 text-xs italic text-[rgb(var(--color-fg-muted))]">
            “{claim.excerpt}”
          </blockquote>
        ) : null}
      </div>
    </div>
  );
}

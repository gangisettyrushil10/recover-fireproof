'use client';

import type { JurisdictionConfidence } from '@fireproof/domain';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../lib/cn.js';

const CONFIDENCE_CLASS: Record<JurisdictionConfidence, string> = {
  high: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  low_inferred: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-300',
};

const CONFIDENCE_LABEL: Record<JurisdictionConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low_inferred: 'Low / inferred',
};

export interface RuleBadgeProps {
  rulePackId: string;
  version?: string | number;
  confidence?: JurisdictionConfidence;
  className?: string;
}

export function RuleBadge({ rulePackId, version, confidence, className }: RuleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg-subtle))] px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-[rgb(var(--color-fg-muted))]" />
      <span className="font-mono text-[11px] text-[rgb(var(--color-fg))]">{rulePackId}</span>
      {version != null ? (
        <span className="text-[rgb(var(--color-fg-muted))]">v{String(version)}</span>
      ) : null}
      {confidence ? (
        <span
          className={cn(
            'rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
            CONFIDENCE_CLASS[confidence],
          )}
        >
          {CONFIDENCE_LABEL[confidence]}
        </span>
      ) : null}
    </span>
  );
}

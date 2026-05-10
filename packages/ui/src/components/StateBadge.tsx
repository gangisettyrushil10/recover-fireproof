'use client';

import type {
  AssetIdentityState,
  CarrierRecommendationState,
  DeficiencyState,
  ImpairmentState,
} from '@fireproof/domain';
import type { ExceptionType } from '@fireproof/domain';
import { cn } from '../lib/cn.js';

type AnyState =
  | ImpairmentState
  | DeficiencyState
  | CarrierRecommendationState
  | AssetIdentityState;

type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red' | 'gray';

const STATE_TONE: Record<string, Tone> = {
  // neutral / draft / detected / imported
  draft: 'neutral',
  detected: 'neutral',
  imported: 'neutral',
  acknowledged: 'neutral',
  // active / in_progress
  active: 'blue',
  in_progress: 'blue',
  repair_in_progress: 'blue',
  assigned: 'blue',
  reconciled: 'blue',
  // pending / safeguards / verification
  safeguards_pending: 'amber',
  proposal_pending: 'amber',
  customer_response_pending: 'amber',
  approved_for_repair: 'amber',
  verification_pending: 'amber',
  evidence_pending: 'amber',
  restoration_testing_required: 'amber',
  restored_evidence_incomplete: 'amber',
  replacement_pending: 'amber',
  retest_pending: 'amber',
  // closed / verified
  closed_audit_ready: 'green',
  closed_verified: 'green',
  // failure / overdue / escalated
  escalated: 'red',
  overdue: 'red',
  // gray / void / waived
  voided: 'gray',
  waived: 'gray',
  declined_risk_accepted: 'gray',
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-[rgb(var(--color-bg-muted))] text-[rgb(var(--color-fg-muted))] border-[rgb(var(--color-border-strong))]',
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-300',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  red: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300',
  gray: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-300',
};

export interface StateBadgeProps {
  /** Exception type. Used purely for label spelling consistency. */
  type?: ExceptionType;
  state: AnyState;
  className?: string;
}

function humanize(state: string): string {
  return state.replace(/_/g, ' ');
}

export function StateBadge({ state, className }: StateBadgeProps) {
  const tone = STATE_TONE[state] ?? 'neutral';
  return (
    <span
      data-state={state}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
    >
      {humanize(state)}
    </span>
  );
}

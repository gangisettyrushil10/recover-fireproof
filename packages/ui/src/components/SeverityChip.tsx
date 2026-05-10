'use client';

import type { Severity } from '@fireproof/domain';
import { cn } from '../lib/cn.js';

const SEVERITY_CLASS: Record<Severity, string> = {
  low: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-300',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-300',
  medium_high: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300',
  critical: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  medium_high: 'Medium-High',
  high: 'High',
  critical: 'Critical',
};

export function SeverityChip({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        SEVERITY_CLASS[severity],
        className,
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

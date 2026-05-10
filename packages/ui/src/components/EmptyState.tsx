'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg-subtle))] px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="text-[rgb(var(--color-fg-subtle))]">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[rgb(var(--color-fg))]">{title}</p>
        {description ? (
          <p className="text-xs text-[rgb(var(--color-fg-muted))]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

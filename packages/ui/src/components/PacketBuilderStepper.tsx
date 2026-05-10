'use client';

import { Check } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface PacketBuilderStep {
  id: string;
  label: string;
  description?: string;
}

export interface PacketBuilderStepperProps {
  steps: PacketBuilderStep[];
  currentStepId: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function PacketBuilderStepper({
  steps,
  currentStepId,
  onStepClick,
  className,
}: PacketBuilderStepperProps) {
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  );

  return (
    <ol className={cn('flex items-stretch gap-2', className)}>
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const Comp: 'button' | 'div' = onStepClick ? 'button' : 'div';
        return (
          <li key={step.id} className="flex-1">
            <Comp
              type={onStepClick ? 'button' : undefined}
              onClick={onStepClick ? () => onStepClick(step.id) : undefined}
              disabled={onStepClick ? idx > currentIdx : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/5'
                  : done
                    ? 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))]'
                    : 'border-dashed border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))]',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active
                      ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-fg))]'
                      : 'border-[rgb(var(--color-border-strong))] text-[rgb(var(--color-fg-muted))]',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[rgb(var(--color-fg))]">
                  {step.label}
                </span>
                {step.description ? (
                  <span className="block truncate text-xs text-[rgb(var(--color-fg-muted))]">
                    {step.description}
                  </span>
                ) : null}
              </span>
            </Comp>
          </li>
        );
      })}
    </ol>
  );
}

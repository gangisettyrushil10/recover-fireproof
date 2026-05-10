'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn.js';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-[72px] w-full rounded-md border bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] placeholder:text-[rgb(var(--color-fg-subtle))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))] disabled:cursor-not-allowed disabled:opacity-50',
        invalid
          ? 'border-[rgb(var(--color-danger))] focus-visible:ring-[rgb(var(--color-danger))]'
          : 'border-[rgb(var(--color-border-strong))]',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-9 w-full rounded-md border bg-[rgb(var(--color-bg))] px-3 text-sm text-[rgb(var(--color-fg))] placeholder:text-[rgb(var(--color-fg-subtle))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))] disabled:cursor-not-allowed disabled:opacity-50',
        invalid
          ? 'border-[rgb(var(--color-danger))] focus-visible:ring-[rgb(var(--color-danger))]'
          : 'border-[rgb(var(--color-border-strong))]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

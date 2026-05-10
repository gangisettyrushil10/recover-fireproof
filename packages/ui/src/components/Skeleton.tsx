'use client';

import { cn } from '../lib/cn.js';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[rgb(var(--color-bg-muted))]',
        className,
      )}
      {...props}
    />
  );
}

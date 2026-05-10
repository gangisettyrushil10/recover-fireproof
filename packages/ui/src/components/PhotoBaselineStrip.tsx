'use client';

import { ImageOff } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface PhotoBaselineStripProps {
  current: { url: string; capturedAt?: string; label?: string } | null;
  previous: { url: string; capturedAt?: string; label?: string } | null;
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

export function PhotoBaselineStrip({
  current,
  previous,
  className,
}: PhotoBaselineStripProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <Frame label="Previous" data={previous} />
      <Frame label="Current" data={current} />
    </div>
  );
}

function Frame({
  label,
  data,
}: {
  label: string;
  data: { url: string; capturedAt?: string; label?: string } | null;
}) {
  return (
    <figure className="overflow-hidden rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))]">
      <div className="flex aspect-video items-center justify-center bg-[rgb(var(--color-bg-muted))] text-[rgb(var(--color-fg-subtle))]">
        {data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.url} alt={data.label ?? label} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6" aria-label="No image available" />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-[rgb(var(--color-fg-muted))]">
        <span className="font-medium uppercase tracking-wide">{label}</span>
        {data?.capturedAt ? <time>{fmt(data.capturedAt)}</time> : null}
      </figcaption>
    </figure>
  );
}

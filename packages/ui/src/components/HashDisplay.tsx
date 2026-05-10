'use client';

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '../lib/cn.js';

export interface HashDisplayProps {
  hash: string;
  /** Truncate to N leading chars in display (full value is copied). */
  truncate?: number;
  className?: string;
}

export function HashDisplay({ hash, truncate = 12, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);
  const display = truncate > 0 && hash.length > truncate ? `${hash.slice(0, truncate)}…` : hash;

  const onCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }, [hash]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))] px-2 py-0.5 font-mono text-[11px] text-[rgb(var(--color-fg))]',
        className,
      )}
    >
      <span title={hash}>{display}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy hash"
        className="text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-fg))]"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}

'use client';

import type { DocumentVersion } from '@fireproof/domain';
import { Download, Lock, Star } from 'lucide-react';
import { HashDisplay } from './HashDisplay.js';
import { cn } from '../lib/cn.js';

export interface DocumentVersionTableProps {
  versions: DocumentVersion[];
  /** True if this document is currently under an active legal hold. */
  holdActive?: boolean;
  onDownload?: (version: DocumentVersion) => void;
  onSelectVersion?: (version: DocumentVersion) => void;
  className?: string;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DocumentVersionTable({
  versions,
  holdActive,
  onDownload,
  onSelectVersion,
  className,
}: DocumentVersionTableProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-[rgb(var(--color-border))]',
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead className="bg-[rgb(var(--color-bg-subtle))] text-[rgb(var(--color-fg-muted))]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Version</th>
            <th className="px-3 py-2 text-left font-medium">SHA-256</th>
            <th className="px-3 py-2 text-left font-medium">Size</th>
            <th className="px-3 py-2 text-left font-medium">Mime</th>
            <th className="px-3 py-2 text-left font-medium">Uploaded</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              onClick={onSelectVersion ? () => onSelectVersion(v) : undefined}
              className={cn(
                'border-t border-[rgb(var(--color-border))]',
                onSelectVersion && 'cursor-pointer hover:bg-[rgb(var(--color-bg-muted))]',
              )}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">v{v.version}</span>
                  {v.is_original ? (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300"
                      title="Original (immutable)"
                    >
                      <Star className="h-3 w-3" />
                      original
                    </span>
                  ) : null}
                  {holdActive ? (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300"
                      title="Legal hold active"
                    >
                      <Lock className="h-3 w-3" />
                      hold
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <HashDisplay hash={v.sha256} />
              </td>
              <td className="px-3 py-2 text-[rgb(var(--color-fg-muted))]">{fmtBytes(v.byte_size)}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-[rgb(var(--color-fg-muted))]">
                {v.mime_type}
              </td>
              <td className="px-3 py-2 text-xs text-[rgb(var(--color-fg-muted))]">
                {fmtDate(v.uploaded_at)}
              </td>
              <td className="px-3 py-2 text-right">
                {onDownload ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(v);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--color-border-strong))] px-2 py-1 text-xs hover:bg-[rgb(var(--color-bg-muted))]"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
          {versions.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-6 text-center text-xs text-[rgb(var(--color-fg-muted))]"
              >
                No versions on file.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

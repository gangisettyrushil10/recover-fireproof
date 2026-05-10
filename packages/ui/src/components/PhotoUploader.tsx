'use client';

import { ImagePlus, X } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from './Button.js';
import { cn } from '../lib/cn.js';

export interface PhotoFile {
  /** Local opaque id (uuid-ish). */
  id: string;
  file: File;
  previewUrl: string;
  /** Client-captured timestamp (ISO). */
  capturedAtClient: string;
}

export interface PhotoUploaderProps {
  value: PhotoFile[];
  onChange: (next: PhotoFile[]) => void;
  /** Max number of attached photos. */
  max?: number;
  className?: string;
  /** Called when offline-pending behaviour should kick in. The form layer
   * is expected to enqueue these to the offline outbox. */
  onAttach?: (added: PhotoFile[]) => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PhotoUploader({
  value,
  onChange,
  onAttach,
  max = 12,
  className,
}: PhotoUploaderProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  // Revoke object URLs when items leave the list.
  useEffect(() => {
    return () => {
      value.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // We intentionally only run this on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const remaining = Math.max(0, max - value.length);
      const next = arr.slice(0, remaining).map<PhotoFile>((file) => ({
        id: uid(),
        file,
        previewUrl: URL.createObjectURL(file),
        capturedAtClient: new Date().toISOString(),
      }));
      if (next.length === 0) return;
      const merged = [...value, ...next];
      onChange(merged);
      onAttach?.(next);
    },
    [value, max, onChange, onAttach],
  );

  const removeAt = useCallback(
    (id: string) => {
      const target = value.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      onChange(value.filter((p) => p.id !== id));
    },
    [value, onChange],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-3 text-sm',
          dragOver
            ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/5'
            : 'border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg-subtle))]',
        )}
      >
        <div className="text-[rgb(var(--color-fg-muted))]">
          {value.length} of {max} photo{max === 1 ? '' : 's'} attached
        </div>
        <label htmlFor={inputId}>
          <Button asChild variant="secondary" size="sm">
            <span className="cursor-pointer">
              <ImagePlus className="h-4 w-4" />
              Add photos
            </span>
          </Button>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((p) => (
            <li
              key={p.id}
              className="relative overflow-hidden rounded-md border border-[rgb(var(--color-border))]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt={p.file.name}
                className="h-24 w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${p.file.name}`}
                onClick={() => removeAt(p.id)}
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

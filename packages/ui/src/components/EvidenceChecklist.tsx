'use client';

import type { EvidenceStatus, EvidenceType } from '@fireproof/domain';
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleSlash,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  notification_proof: 'AHJ notification proof',
  fire_watch_record: 'Fire-watch record',
  restoration_test_record: 'Restoration test readings',
  photo_evidence: 'Photo evidence',
  customer_decision: 'Customer decision',
  proposal_transmission_proof: 'Proposal transmission proof',
  asset_identity_proof: 'Asset identity proof',
  original_source_document: 'Original source document',
  counsel_hold_notice: 'Counsel hold notice',
};

const STATUS_ICON: Record<EvidenceStatus, ReactNode> = {
  missing: <Circle className="h-4 w-4 text-[rgb(var(--color-fg-subtle))]" aria-label="missing" />,
  pending: <CircleDashed className="h-4 w-4 text-amber-500" aria-label="pending" />,
  insufficient: <TriangleAlert className="h-4 w-4 text-amber-600" aria-label="insufficient" />,
  valid: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="valid" />,
  waived: <CircleSlash className="h-4 w-4 text-slate-500" aria-label="waived" />,
};

const STATUS_LABEL: Record<EvidenceStatus, string> = {
  missing: 'Missing',
  pending: 'Pending',
  insufficient: 'Insufficient',
  valid: 'Valid',
  waived: 'Waived',
};

export interface EvidenceChecklistItemProps {
  evidenceType: EvidenceType;
  status: EvidenceStatus;
  required?: boolean;
  blocking?: boolean;
  notes?: string;
  fixTargetId?: string;
  onClick?: () => void;
  className?: string;
}

export function EvidenceChecklistItem({
  evidenceType,
  status,
  required = true,
  blocking = false,
  notes,
  onClick,
  className,
}: EvidenceChecklistItemProps) {
  const Comp: 'button' | 'div' = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-left',
        onClick && 'hover:bg-[rgb(var(--color-bg-muted))]',
        className,
      )}
    >
      <div className="flex h-5 w-5 items-center justify-center">{STATUS_ICON[status]}</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[rgb(var(--color-fg))]">
          {EVIDENCE_TYPE_LABEL[evidenceType]}
        </p>
        {notes ? (
          <p className="truncate text-xs text-[rgb(var(--color-fg-muted))]">{notes}</p>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {blocking ? (
          <span className="rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-300">
            blocking
          </span>
        ) : required ? (
          <span className="rounded-sm bg-[rgb(var(--color-bg-muted))] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
            required
          </span>
        ) : null}
        <span className="text-xs font-medium text-[rgb(var(--color-fg-muted))]">
          {STATUS_LABEL[status]}
        </span>
      </div>
    </Comp>
  );
}

export interface EvidenceChecklistProps {
  items: Array<{
    evidenceType: EvidenceType;
    status: EvidenceStatus;
    required?: boolean;
    blocking?: boolean;
    notes?: string;
    fixTargetId?: string;
  }>;
  onSelect?: (evidenceType: EvidenceType) => void;
  className?: string;
}

export function EvidenceChecklist({ items, onSelect, className }: EvidenceChecklistProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {items.map((item) => (
        <EvidenceChecklistItem
          key={item.evidenceType}
          {...item}
          onClick={onSelect ? () => onSelect(item.evidenceType) : undefined}
        />
      ))}
    </div>
  );
}

'use client';

import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card.js';
import { cn } from '../lib/cn.js';

export interface SignedDecisionCardProps {
  /** What kind of decision this card is collecting. */
  kind: 'deficiency_decline' | 'risk_accept' | 'customer_decline';
  description: string;
  /** Has the form been completed and signed? */
  signed: boolean;
  signedAt?: string;
  signedByLabel?: string;
  children?: ReactNode;
  className?: string;
}

const KIND_LABEL: Record<SignedDecisionCardProps['kind'], string> = {
  deficiency_decline: 'Decline of recommended repair',
  risk_accept: 'Risk-acceptance signoff',
  customer_decline: 'Customer decline (signed)',
};

function fmt(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SignedDecisionCard({
  kind,
  description,
  signed,
  signedAt,
  signedByLabel,
  children,
  className,
}: SignedDecisionCardProps) {
  return (
    <Card className={cn('border-amber-500/40', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <CardTitle>{KIND_LABEL[kind]}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[rgb(var(--color-fg-muted))]">{description}</p>
        {signed ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2 text-xs">
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Signed</span>
            {signedByLabel ? (
              <>
                {' '}by <span className="text-[rgb(var(--color-fg))]">{signedByLabel}</span>
              </>
            ) : null}
            {signedAt ? (
              <>
                {' '}on{' '}
                <time className="text-[rgb(var(--color-fg-muted))]">{fmt(signedAt)}</time>
              </>
            ) : null}
            .
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
            Awaiting signed proof. The state cannot move to a closed/declined state without it.
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

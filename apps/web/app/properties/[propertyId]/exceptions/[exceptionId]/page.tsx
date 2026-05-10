'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  StateBadge,
  SeverityChip,
} from '@fireproof/ui';
import { apiClient, ApiError } from '@/lib/api';

const CLOSE_TARGETS: Record<string, string> = {
  impairment: 'closed_audit_ready',
  deficiency: 'closed_verified',
  carrier_recommendation: 'closed_verified',
  asset_identity: 'closed_verified',
};

const STATUS_TONE: Record<string, string> = {
  valid: 'text-emerald-700',
  insufficient: 'text-amber-700',
  missing: 'text-red-700',
  pending: 'text-slate-600',
  waived: 'text-slate-500',
};

export default function ExceptionDetailPage() {
  const params = useParams<{ exceptionId: string }>();
  const exceptionId = params.exceptionId;
  const qc = useQueryClient();
  const [closeError, setCloseError] = useState<{
    message: string;
    missing: string[];
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['exception', exceptionId],
    queryFn: () => apiClient.exceptions.get(exceptionId),
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('not loaded');
      const target = CLOSE_TARGETS[data.exception.type] ?? 'closed_audit_ready';
      return apiClient.exceptions.transition(exceptionId, {
        to_state: target,
        reason: 'demo close',
      });
    },
    onSuccess: () => {
      setCloseError(null);
      void qc.invalidateQueries({ queryKey: ['exception', exceptionId] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.body.code === 'BLOCKING_REQUIREMENTS_UNMET') {
        const missing =
          (err.body.details?.unmet as string[] | undefined) ?? err.body.missing ?? [];
        setCloseError({
          message: 'Close blocked — required evidence is missing or insufficient.',
          missing,
        });
      } else {
        setCloseError({
          message: err instanceof Error ? err.message : 'Close failed.',
          missing: [],
        });
      }
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) {
    return <p className="text-sm text-red-600">Failed: {(error as Error).message}</p>;
  }
  if (!data) return null;

  const ex = data.exception;
  const evalAny = data.latest_evaluation as unknown as
    | { blocking_json?: unknown[]; requirements_json?: unknown[]; is_satisfied?: boolean; evaluated_at?: string }
    | null;
  const blockers = (evalAny?.blocking_json ?? []) as Array<{
    key?: string;
    evidence_type?: string;
  }>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {ex.type.replace(/_/g, ' ')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{ex.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={ex.state as never} />
          <SeverityChip severity={ex.severity as never} />
          <span className="text-xs text-muted-foreground">
            Opened {new Date(ex.opened_at).toLocaleString()}
          </span>
        </div>
        {ex.summary && <p className="text-sm text-muted-foreground">{ex.summary}</p>}
      </header>

      {blockers.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <h2 className="text-sm font-semibold text-amber-900">
              {blockers.length} blocking requirement
              {blockers.length === 1 ? '' : 's'} prevent closure
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-amber-900 list-disc pl-5">
              {blockers.map((b, i) => (
                <li key={i}>{b.key ?? `${b.evidence_type}.valid`}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Evidence checklist</h2>
          <Button
            variant="primary"
            disabled={closeMutation.isPending}
            onClick={() => closeMutation.mutate()}
          >
            {closeMutation.isPending ? 'Requesting close…' : 'Request close'}
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Evidence type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Notes</th>
                <th className="py-2 pr-4">Errors</th>
              </tr>
            </thead>
            <tbody>
              {data.evidence.map((e) => {
                const eAny = e as unknown as {
                  id: string;
                  evidence_type: string;
                  status: string;
                  validation_errors_json?: Array<{ field: string; message: string }> | null;
                  notes?: string | null;
                };
                const errs = eAny.validation_errors_json ?? [];
                return (
                  <tr key={eAny.id} className="border-t align-top">
                    <td className="py-2 pr-4 font-medium">{eAny.evidence_type}</td>
                    <td
                      className={
                        'py-2 pr-4 font-medium ' +
                        (STATUS_TONE[eAny.status] ?? 'text-foreground')
                      }
                    >
                      {eAny.status}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {eAny.notes ?? ''}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {errs.length === 0
                        ? '—'
                        : errs.map((err, i) => (
                            <div key={i}>
                              <span className="font-mono">{err.field}:</span> {err.message}
                            </div>
                          ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {closeError && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">{closeError.message}</p>
              {closeError.missing.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {closeError.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {evalAny && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Rule evaluation</h2>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Evaluated{' '}
              {evalAny.evaluated_at
                ? new Date(evalAny.evaluated_at).toLocaleString()
                : '—'}
            </p>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  is_satisfied: evalAny.is_satisfied,
                  blocking: evalAny.blocking_json,
                  requirements: evalAny.requirements_json,
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

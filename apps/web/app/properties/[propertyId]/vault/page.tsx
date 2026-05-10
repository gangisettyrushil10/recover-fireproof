'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader } from '@fireproof/ui';
import { apiClient, ApiError } from '@/lib/api';

export default function VaultPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;
  const qc = useQueryClient();
  const [holdMessage, setHoldMessage] = useState<string | null>(null);

  const docsQuery = useQuery({
    queryKey: ['vault', propertyId],
    queryFn: () =>
      apiClient.request<{ items: Array<{ id: string; title: string; source_type: string; hold_status?: string }> }>(
        `/v1/properties/${propertyId}/documents`,
      ),
  });

  const holdsQuery = useQuery({
    queryKey: ['legal-holds', propertyId],
    queryFn: () =>
      apiClient.request<{
        items: Array<{
          id: string;
          name: string;
          status: string;
          scope_type: string;
          scope_id: string;
          reason: string;
        }>;
      }>(`/v1/legal-holds?scope_type=property&scope_id=${propertyId}`),
  });

  const createHold = useMutation({
    mutationFn: () =>
      apiClient.request<{ id: string; status: string }>('/v1/legal-holds', {
        method: 'POST',
        json: {
          scope_type: 'property',
          scope_id: propertyId,
          reason: 'Counsel post-fire preservation hold',
          name: 'Post-fire preservation hold — demo',
        },
      }),
    onSuccess: () => {
      setHoldMessage('Legal hold activated. Originals can no longer be overwritten or deleted.');
      void qc.invalidateQueries({ queryKey: ['legal-holds', propertyId] });
    },
    onError: (err) => {
      setHoldMessage(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

  const releaseHold = useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/v1/legal-holds/${id}/release`, {
        method: 'POST',
        json: { reason: 'Demo release' },
      }),
    onSuccess: () => {
      setHoldMessage('Hold released.');
      void qc.invalidateQueries({ queryKey: ['legal-holds', propertyId] });
    },
  });

  const activeHolds = (holdsQuery.data?.items ?? []).filter((h) => h.status === 'active');
  const holdActive = activeHolds.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Originals vault</h1>
          <p className="text-sm text-muted-foreground">
            Immutable originals with SHA-256 checksum and version history.
          </p>
        </div>
        <div className="flex gap-2">
          {holdActive ? (
            <Button
              variant="secondary"
              onClick={() =>
                activeHolds[0] && releaseHold.mutate(activeHolds[0].id)
              }
            >
              Release hold
            </Button>
          ) : (
            <Button onClick={() => createHold.mutate()} disabled={createHold.isPending}>
              {createHold.isPending ? 'Activating…' : 'Apply legal hold'}
            </Button>
          )}
        </div>
      </header>

      {holdActive && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Property under active legal hold — original document versions are protected from
          overwrite and deletion. ({activeHolds.length} active)
        </div>
      )}

      {holdMessage && (
        <div className="rounded-md border bg-muted p-3 text-sm">{holdMessage}</div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Documents</h2>
        </CardHeader>
        <CardContent>
          {docsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Hold</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docsQuery.data?.items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{d.title}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{d.source_type}</td>
                  <td className="py-2 pr-4">
                    {holdActive || d.hold_status === 'active' ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        active
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">none</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/documents/${d.id}`}
                      className="text-xs text-blue-600 underline"
                    >
                      details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

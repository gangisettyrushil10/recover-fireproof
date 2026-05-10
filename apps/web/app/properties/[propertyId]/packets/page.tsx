'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader } from '@fireproof/ui';
import { apiClient, ApiError } from '@/lib/api';

const PACKET_TYPES = [
  { type: 'AHJ_NOV_RESPONSE', label: 'AHJ NOV response' },
  { type: 'OWNER_RESPONSE', label: 'Owner response' },
  { type: 'INSURER_LOSS_CONTROL', label: 'Insurer / loss control' },
  { type: 'COUNSEL_SUBROGATION', label: 'Counsel / subrogation' },
] as const;

export default function PacketsPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['packets', propertyId],
    queryFn: () => apiClient.packets.list({ property_id: propertyId }),
  });

  const create = useMutation({
    mutationFn: (type: (typeof PACKET_TYPES)[number]['type']) =>
      apiClient.request<{ id: string; status: string; artifact_storage_key?: string | null }>(
        '/v1/packets',
        {
          method: 'POST',
          json: {
            property_id: propertyId,
            packet_type: type,
            title: PACKET_TYPES.find((p) => p.type === type)?.label ?? type,
          },
        },
      ),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['packets', propertyId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Failed.');
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Packet builder</h1>
        <p className="text-sm text-muted-foreground">
          Generate stakeholder-specific export bundles. Each packet contains a summary PDF, a
          machine-readable manifest, and original document versions.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Create a packet</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PACKET_TYPES.map((p) => (
              <Button
                key={p.type}
                variant="secondary"
                disabled={create.isPending}
                onClick={() => create.mutate(p.type)}
                className="justify-start"
              >
                {create.isPending ? 'Generating…' : `Generate: ${p.label}`}
              </Button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Generated packets</h2>
        </CardHeader>
        <CardContent>
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {list.data?.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No packets yet.</p>
          )}
          <ul className="space-y-2">
            {(list.data?.items as Array<{
              id: string;
              title?: string;
              packet_type: string;
              status: string;
              generated_at?: string | null;
            }> | undefined)?.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{p.title ?? p.packet_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.packet_type} · status {p.status} ·{' '}
                    {p.generated_at ? new Date(p.generated_at).toLocaleString() : '—'}
                  </p>
                </div>
                {p.status === 'ready' && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/packets/${p.id}/download`}
                    className="text-sm text-blue-600 underline"
                  >
                    Download ZIP
                  </a>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

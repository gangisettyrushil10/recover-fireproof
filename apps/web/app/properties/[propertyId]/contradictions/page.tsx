'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, SeverityChip } from '@fireproof/ui';
import { apiClient } from '@/lib/api';

const TYPE_LABEL: Record<string, string> = {
  time_overlap_disagreement: 'Report vs internal note mismatch',
  identity_attribute_mismatch: 'Asset identity mismatch',
  restoration_test_disagreement: 'Restoration test disagreement',
  notification_proof_missing_or_late: 'Notification proof missing/late',
  fire_watch_gap: 'Fire watch gap',
  asset_location_conflict: 'Asset location conflict',
  other: 'Other',
};

export default function ContradictionsPage() {
  const params = useParams<{ propertyId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['contradictions', params.propertyId],
    queryFn: () => apiClient.properties.contradictions(params.propertyId),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Contradiction map</h1>
        <p className="text-sm text-muted-foreground">
          Conflicts between official records and internal notes, asset identity, or threshold
          requirements.
        </p>
      </header>

      <div className="space-y-3">
        {data?.items.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {TYPE_LABEL[c.type] ?? c.type}
                </p>
                <p className="text-xs text-muted-foreground">Confidence: {Number(c.confidence).toFixed(2)}</p>
              </div>
              <SeverityChip severity={c.severity as never} />
            </CardHeader>
            <CardContent>
              <p className="text-sm">{(c as { description?: string }).description}</p>
              <p className="mt-2 text-xs text-muted-foreground font-mono">
                claim_a: {c.claim_a_id} · claim_b: {c.claim_b_id}
              </p>
            </CardContent>
          </Card>
        ))}
        {data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No contradictions detected.</p>
        )}
      </div>
    </div>
  );
}

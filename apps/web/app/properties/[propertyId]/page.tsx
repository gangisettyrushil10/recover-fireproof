'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, StateBadge, SeverityChip } from '@fireproof/ui';
import { apiClient } from '@/lib/api';

export default function DashboardPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', propertyId],
    queryFn: () => apiClient.properties.dashboard(propertyId),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">Failed to load dashboard: {(error as Error).message}</p>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{data.property.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.property.address ?? ''}
          {data.property.jurisdiction
            ? ` · ${data.property.jurisdiction.name} (rule confidence: ${data.property.jurisdiction.confidence})`
            : ''}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground">Open exceptions</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.risk_summary.open_count}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.risk_summary.blocking_count} with blocking requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground">Contradictions</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.contradiction_count}</p>
            <Link
              href={`/properties/${propertyId}/contradictions`}
              className="text-xs text-blue-600 underline"
            >
              View map →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground">Severity breakdown</h3>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {Object.entries(data.risk_summary.severity_breakdown).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Open exceptions</h2>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Blockers</th>
                <th className="py-2 pr-4">Opened</th>
              </tr>
            </thead>
            <tbody>
              {data.open_exceptions.map((e) => {
                const evalAny = e.latest_evaluation as unknown as
                  | { blocking_json?: unknown[] }
                  | null;
                const blockers = evalAny?.blocking_json ?? [];
                return (
                  <tr key={e.id} className="border-t hover:bg-muted/40">
                    <td className="py-2 pr-4">
                      <Link
                        className="text-blue-700 underline"
                        href={`/properties/${propertyId}/exceptions/${e.id}`}
                      >
                        {e.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{e.type}</td>
                    <td className="py-2 pr-4">
                      <StateBadge state={e.state as never} />
                    </td>
                    <td className="py-2 pr-4">
                      <SeverityChip severity={e.severity as never} />
                    </td>
                    <td className="py-2 pr-4">
                      {blockers.length > 0 ? (
                        <span className="text-amber-700 font-medium">{blockers.length}</span>
                      ) : (
                        <span className="text-emerald-700">0</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {new Date(e.opened_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Packet readiness</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {data.packet_readiness.map((p) => (
              <div key={p.type} className="rounded-md border p-3">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ready: {p.ready_count} · Missing: {p.missing_count}
                </p>
                {p.last_emitted_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last emitted {new Date(p.last_emitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
          <Link
            href={`/properties/${propertyId}/packets`}
            className="mt-3 inline-block text-sm text-blue-600 underline"
          >
            Open packet builder →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Recent activity</h2>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {data.recent_audit_events.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b py-1.5">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{a.action}</span>{' '}
                  <span>{a.entity_type}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

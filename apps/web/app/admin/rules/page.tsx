'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@fireproof/ui';
import { apiClient, getAuthToken } from '@/lib/api';

export default function RulesAdminPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getAuthToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rule-packs'],
    queryFn: () => apiClient.rulePacks.list(),
    enabled: !!getAuthToken(),
  });

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rule packs</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          ← Back
        </Link>
      </header>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Active and seeded packs</h2>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Jurisdiction</th>
                <th className="py-2 pr-4">Version</th>
                <th className="py-2 pr-4">Effective from</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{(p as { jurisdiction_name?: string }).jurisdiction_name ?? p.jurisdiction_id}</td>
                  <td className="py-2 pr-4">{p.version}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {p.effective_from ? new Date(p.effective_from).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 pr-4">{p.confidence}</td>
                  <td className="py-2 pr-4">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}

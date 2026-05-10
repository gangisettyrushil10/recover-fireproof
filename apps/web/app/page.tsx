'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getAuthToken } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!getAuthToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: () =>
      apiClient.request<{ items: Array<{ id: string; name: string }> }>(
        '/v1/properties',
      ),
    enabled: !!getAuthToken(),
  });

  useEffect(() => {
    if (data?.items?.[0]?.id) {
      router.replace(`/properties/${data.items[0].id}`);
    }
  }, [data, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {isLoading && 'Loading…'}
      {error && (
        <span className="text-red-600">
          Failed to load properties — sign in at /login.
        </span>
      )}
      {!isLoading && !error && data?.items?.length === 0 && 'No properties yet.'}
    </main>
  );
}

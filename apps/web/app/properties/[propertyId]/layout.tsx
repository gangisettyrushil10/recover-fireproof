'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient, clearAuthToken, getAuthToken } from '@/lib/api';
import { useEffect } from 'react';

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const pathname = usePathname();
  const propertyId = params.propertyId;

  useEffect(() => {
    if (!getAuthToken()) router.replace('/login');
  }, [router]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.auth.me(),
    enabled: !!getAuthToken(),
    retry: false,
  });

  const tabs = [
    { href: `/properties/${propertyId}`, label: 'Dashboard' },
    { href: `/properties/${propertyId}/contradictions`, label: 'Contradictions' },
    { href: `/properties/${propertyId}/packets`, label: 'Packets' },
    { href: `/properties/${propertyId}/vault`, label: 'Vault' },
    { href: `/admin/rules`, label: 'Rules' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold tracking-tight">
              Fireproof
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {tabs.map((t) => {
                const active =
                  t.href === pathname ||
                  (t.href !== `/properties/${propertyId}` && pathname.startsWith(t.href));
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={
                      'rounded-md px-3 py-1.5 ' +
                      (active
                        ? 'bg-foreground/10 font-medium'
                        : 'text-muted-foreground hover:text-foreground')
                    }
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {meQuery.data?.user && (
              <span>
                {meQuery.data.user.name} · {meQuery.data.user.role} ·{' '}
                {meQuery.data.user.organization_name}
              </span>
            )}
            <button
              onClick={() => {
                clearAuthToken();
                router.replace('/login');
              }}
              className="text-xs underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}

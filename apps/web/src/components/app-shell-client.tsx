'use client';

import {
  AppShell,
  type AppShellProps,
  type AppShellNavItem,
  Button,
} from '@fireproof/ui';
import { LogOut, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { clearAuthToken } from '@/lib/api';
import { useUiStore } from '@/lib/store';
import { useOutboxList } from '@/hooks/use-outbox';

const NAV: Array<Omit<AppShellNavItem, 'active'>> = [
  { href: '/', label: 'Dashboard' },
  { href: '/exceptions', label: 'Exceptions' },
  { href: '/contradictions', label: 'Contradictions' },
  { href: '/packets', label: 'Packets' },
  { href: '/vault', label: 'Vault' },
  { href: '/admin/rules', label: 'Admin' },
];

export interface AppShellClientProps {
  user: AppShellProps['user'];
  topbarLeft?: React.ReactNode;
  /** When provided, NAV hrefs are scoped under `/properties/:id/...`. */
  propertyId?: string;
  children: React.ReactNode;
  onOpenOutbox?: () => void;
}

export function AppShellClient({
  user,
  topbarLeft,
  propertyId,
  children,
  onOpenOutbox,
}: AppShellClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const outboxCount = useUiStore((s) => s.outboxCount);
  const { open } = useOutboxList();

  const navItems = useMemo<AppShellNavItem[]>(() => {
    const scope = propertyId ? `/properties/${propertyId}` : '';
    return NAV.map((n) => {
      let href = n.href;
      if (propertyId) {
        if (n.href === '/') href = scope;
        else if (n.href.startsWith('/admin')) href = n.href;
        else href = `${scope}${n.href}`;
      }
      return {
        ...n,
        href,
        active: pathname === href || (href !== '/' && pathname.startsWith(href)),
      };
    });
  }, [propertyId, pathname]);

  return (
    <AppShell
      user={user}
      navItems={navItems}
      outboxCount={outboxCount}
      onOpenOutbox={onOpenOutbox ?? open}
      topbarLeft={topbarLeft}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
      topbarRight={
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => {
              clearAuthToken();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      }
    >
      {children}
    </AppShell>
  );
}

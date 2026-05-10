'use client';

import {
  Activity,
  AlertOctagon,
  CloudOff,
  GitCompare,
  LayoutDashboard,
  PackageOpen,
  Settings,
  Vault,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface AppShellNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
}

export interface AppShellUser {
  name: string;
  email: string;
  role: string;
  organization: string;
}

export interface AppShellProps {
  user?: AppShellUser | null;
  navItems?: AppShellNavItem[];
  /** Number of pending offline-outbox items. */
  outboxCount?: number;
  onOpenOutbox?: () => void;
  /** Slot rendered into top-bar on the right (theme toggle, etc.). */
  topbarRight?: ReactNode;
  /** Slot for the topbar title/breadcrumb. */
  topbarLeft?: ReactNode;
  /** Render a custom Link component for client-side nav. */
  renderLink?: (props: {
    href: string;
    className: string;
    children: ReactNode;
  }) => ReactNode;
  children: ReactNode;
}

export const DEFAULT_NAV_ITEMS: AppShellNavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/exceptions', label: 'Exceptions', icon: <AlertOctagon className="h-4 w-4" /> },
  { href: '/contradictions', label: 'Contradictions', icon: <GitCompare className="h-4 w-4" /> },
  { href: '/packets', label: 'Packets', icon: <PackageOpen className="h-4 w-4" /> },
  { href: '/vault', label: 'Vault', icon: <Vault className="h-4 w-4" /> },
  { href: '/admin/rules', label: 'Admin', icon: <Settings className="h-4 w-4" /> },
];

export function AppShell({
  user,
  navItems = DEFAULT_NAV_ITEMS,
  outboxCount = 0,
  onOpenOutbox,
  topbarRight,
  topbarLeft,
  renderLink,
  children,
}: AppShellProps) {
  return (
    <div className="grid h-screen grid-cols-[240px_1fr] grid-rows-[56px_1fr] bg-[rgb(var(--color-bg))]">
      {/* Sidebar */}
      <aside className="row-span-2 flex h-full flex-col border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-subtle))]">
        <div className="flex h-14 items-center gap-2 border-b border-[rgb(var(--color-border))] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgb(var(--color-fg))] text-[rgb(var(--color-bg))]">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Fireproof</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map((item) => {
            const className = cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium',
              item.active
                ? 'bg-[rgb(var(--color-bg-muted))] text-[rgb(var(--color-fg))]'
                : 'text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-bg-muted))] hover:text-[rgb(var(--color-fg))]',
            );
            const inner = (
              <>
                {item.icon}
                <span>{item.label}</span>
              </>
            );
            if (renderLink) {
              return (
                <span key={item.href}>
                  {renderLink({ href: item.href, className, children: inner })}
                </span>
              );
            }
            return (
              <a key={item.href} href={item.href} className={className}>
                {inner}
              </a>
            );
          })}
        </nav>

        {user ? (
          <div className="border-t border-[rgb(var(--color-border))] p-3">
            <div className="text-xs">
              <p className="truncate font-medium text-[rgb(var(--color-fg))]">{user.name}</p>
              <p className="truncate text-[rgb(var(--color-fg-muted))]">{user.email}</p>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded-md border border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-bg))] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
                {user.role}
              </span>
              <span
                className="truncate text-[10px] text-[rgb(var(--color-fg-muted))]"
                title={user.organization}
              >
                {user.organization}
              </span>
            </div>
          </div>
        ) : null}
      </aside>

      {/* Topbar */}
      <header className="flex h-14 items-center justify-between border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-4">
        <div className="min-w-0 truncate text-sm text-[rgb(var(--color-fg-muted))]">{topbarLeft}</div>
        <div className="flex items-center gap-3">
          {outboxCount > 0 ? (
            <button
              type="button"
              onClick={onOpenOutbox}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
              aria-label={`${outboxCount} pending outbox items`}
            >
              <CloudOff className="h-3.5 w-3.5" />
              {outboxCount} pending
            </button>
          ) : null}
          {topbarRight}
        </div>
      </header>

      {/* Main slot */}
      <main className="overflow-y-auto bg-[rgb(var(--color-bg))]">{children}</main>
    </div>
  );
}

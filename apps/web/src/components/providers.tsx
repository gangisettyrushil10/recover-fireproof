'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, ToastViewport, TooltipProvider } from '@fireproof/ui';
import { useEffect, useState } from 'react';
import { startOutboxLoop, onOutboxChange, listOutbox } from '@/lib/outbox';
import { useUiStore } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, err) => {
              const status = (err as { status?: number }).status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  const setOutboxCount = useUiStore((s) => s.setOutboxCount);
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    // Bootstrap theme from localStorage.
    if (typeof window === 'undefined') return;
    const t = window.localStorage.getItem('fireproof:theme');
    if (t === 'dark' || t === 'light') setTheme(t);
    else setTheme('light');
  }, [setTheme]);

  useEffect(() => {
    const stop = startOutboxLoop();
    const unsub = onOutboxChange((n) => setOutboxCount(n));

    // Initial load.
    void listOutbox().then((items) => setOutboxCount(items.length));

    // Service worker message channel: flush when SW says so.
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'fireproof:flush-outbox') {
        void import('@/lib/outbox').then((m) => m.flushOutbox());
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMsg);
    }

    return () => {
      stop();
      unsub();
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMsg);
      }
    };
  }, [setOutboxCount]);

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={150}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

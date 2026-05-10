'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore registration errors in dev */
    });
  }, []);
  return null;
}

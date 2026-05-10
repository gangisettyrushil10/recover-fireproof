/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API: network-first, fall back to cache for offline reads.
    {
      matcher: ({ url }) => url.pathname.startsWith('/v1/'),
      handler: new NetworkFirst({
        cacheName: 'fireproof-api',
        networkTimeoutSeconds: 6,
        plugins: [
          new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
    // Static assets: stale-while-revalidate.
    {
      matcher: ({ request }) =>
        ['style', 'script', 'worker'].includes(request.destination),
      handler: new StaleWhileRevalidate({ cacheName: 'fireproof-assets' }),
    },
    // Images: cache-first.
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'fireproof-images',
        plugins: [
          new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

// Background-sync: when the browser fires a `sync` event we ask the
// outbox loop on the page to flush. Workers don't have direct DB access
// to our key-val store, so we just message clients and let them flush.
self.addEventListener('sync', (event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === 'fireproof-outbox') {
    event.waitUntil(
      (async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of all) c.postMessage({ type: 'fireproof:flush-outbox' });
      })(),
    );
  }
});

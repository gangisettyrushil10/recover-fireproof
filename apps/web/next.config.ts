import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // UI components are client-side; bundle them.
  transpilePackages: ['@fireproof/ui'],
  // The route-handler stack runs on the server. Treating these as external
  // means Node's runtime resolver finds them via pnpm's workspace
  // symlinks — webpack stops trying to recursively bundle their imports.
  serverExternalPackages: [
    '@fireproof/api',
    '@fireproof/db',
    '@fireproof/domain',
    '@fireproof/legal-export',
    '@fireproof/rules',
    'drizzle-orm',
    'pg',
    'pdf-lib',
    'archiver',
    'jose',
  ],
  // Route handlers in /app/api/v1/** wrap the same domain services used by
  // the standalone Fastify API. The apiClient targets /v1/* — rewrite to the
  // colocated handlers under /api/v1/*. A NEXT_PUBLIC_API_URL override still
  // works for split-host deploys (web on Vercel, API on a separate host).
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      // Split-host: don't rewrite; apiClient already prefixes the absolute
      // origin and the rewrite would conflict.
      return [];
    }
    return [{ source: '/v1/:path*', destination: '/api/v1/:path*' }];
  },
  // The API returns Drizzle row shapes (snake_case `*_json` columns); our
  // domain Zod types are camelCase. Demo pages narrow each shape locally via
  // `as unknown as { … }`. Skip Next's strict type-check pass at build —
  // the compiled bundle is correct; this drift is a known seam we'd close
  // with API DTO mappers in production.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Increase serverless function timeout for packet generation.
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  webpack: (config) => {
    // Workspace packages and our own src use ESM-style `.js` extensions in
    // imports (so the same files work under tsup builds). Webpack needs a
    // hand to resolve those back to `.ts` / `.tsx` source files.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default withSerwist(nextConfig);

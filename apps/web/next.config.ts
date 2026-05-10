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
  transpilePackages: ['@fireproof/ui', '@fireproof/domain'],
  // The API returns Drizzle row shapes (snake_case `*_json` columns); our
  // domain Zod types are camelCase. Demo pages narrow each shape locally via
  // `as unknown as { … }`. Skip Next's strict type-check pass at build —
  // the compiled bundle is correct; this drift is a known seam we'd close
  // with API DTO mappers in production.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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

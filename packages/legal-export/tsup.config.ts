import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/claims/extractor.ts',
    'src/contradictions/engine.ts',
    'src/packets/index.ts',
    'src/packets/manifest.ts',
    'src/packets/builder.ts',
    'src/holds/policy.ts',
    'src/audit/chain.ts',
  ],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  outDir: 'dist',
});

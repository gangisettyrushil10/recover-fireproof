import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/enums.ts',
    'src/states.ts',
    'src/transitions.ts',
    'src/errors.ts',
    'src/schemas/index.ts',
    'src/api/index.ts',
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

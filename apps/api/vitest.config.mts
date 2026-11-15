import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/api',
  test: {
    name: 'api',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.e2e-spec.ts'],
    // Each worker boots and migrates one PGlite template (~2-6 s, far more while lint and
    // typecheck share the CPU). Setup hooks get 60 s; tests keep the 5 s default.
    hookTimeout: 60_000,
    // Spec files in the same worker share one module cache, so NestJS and its dependencies
    // are imported once per worker instead of once per file (about a third faster here). Safe because
    // every spec builds its own Nest app and database and no module holds mutable state.
    isolate: false,
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

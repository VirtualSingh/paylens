/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
    host: 'localhost',
    // Same origin as production, where Vercel rewrites /api/* to the API project: the
    // browser only ever talks to the web origin, so there is no CORS to configure.
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  // `@/…` imports resolve through the "paths" in tsconfig (shadcn/ui expects this alias).
  resolve: { tsconfigPaths: true },
  plugins: [react(), tailwindcss(), nxReadySignal()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['./src/testing/setup.ts'],
    // Page tests take 0.1–0.8 s alone, but over 5 s while lint and typecheck share the CPU
    // (pre-commit hook, CI): room for that, without hiding a test that really hangs.
    testTimeout: 15_000,
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));

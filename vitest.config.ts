import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environmentMatchGlobs: [
      ['src/lib/sync-queue.test.ts', 'happy-dom'],
      // Dexie a besoin d'un environnement navigateur (structuredClone, events).
      ['src/lib/anatomie/progression.test.ts', 'happy-dom'],
    ],
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});

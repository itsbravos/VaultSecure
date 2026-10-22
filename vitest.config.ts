import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // brag-output/ holds the launch video build (and a temporary browser profile while rendering)
    exclude: ['**/node_modules/**', 'brag-output/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
});

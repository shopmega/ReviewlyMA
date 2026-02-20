import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/lib/__tests__/types-validation.test.ts',
      'src/lib/__tests__/rate-limiter.test.ts',
      'src/lib/__tests__/cache.test.ts',
      'src/lib/__tests__/logger.test.ts',
      'src/lib/__tests__/utils.test.ts',
      'src/lib/__tests__/data-helpers.test.ts',
      'src/lib/__tests__/auth-helpers.test.ts',
      'src/lib/__tests__/errors.test.ts',
      'src/lib/__tests__/admin-queries.test.ts',
      'src/notifications.test.ts',
    ],
    exclude: ['node_modules', '.next', 'tests'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

/**
 * Test environment configuration
 * Sets up different test environments for various testing scenarios
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Base configuration shared across all test environments
const baseConfig = {
  plugins: [react()],
  esbuild: {
    jsx: 'automatic' as const,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup.ts'],
    include: ['../../src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules',
      '.next',
      'src/test/',
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/__tests__/**',
      '**/*.d.ts',
      '**/*.config.*',
      '**/mock-data.ts',
      'scripts/**',
      'tests/**',
      'testsprite_tests/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
};

// Unit test configuration
const unitTestConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'unit',
    include: [
      '../../src/components/**/*.{test,spec}.{ts,tsx}',
      '../../src/lib/**/*.{test,spec}.{ts,tsx}',
      '../../src/utils/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        '.next/**',
        'src/test/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mock-data.ts',
        'scripts/**',
        'tests/**',
        'testsprite_tests/**',
        'playwright-report/**',
        'test-results/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});

// Integration test configuration
const integrationTestConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'integration',
    include: [
      '../../src/app/actions/**/*.{test,spec}.{ts,tsx}',
      '../../src/app/api/**/*.{test,spec}.{ts,tsx}',
      '../../src/contexts/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/app/actions/**/*.{ts,tsx}', 'src/app/api/**/*.{ts,tsx}', 'src/contexts/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        '.next/**',
        'src/test/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mock-data.ts',
        'scripts/**',
        'tests/**',
        'testsprite_tests/**',
        'playwright-report/**',
        'test-results/**',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
  },
});

// Critical path test configuration
const criticalTestConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'critical',
    include: [
      '../../src/app/actions/__tests__/auth.test.ts',
      '../../src/app/actions/__tests__/business-crud.test.ts',
      '../../src/app/actions/__tests__/review.test.ts',
      '../../src/lib/__tests__/auth-helpers.test.ts',
      '../../src/lib/__tests__/dashboard-queries.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: [
        'src/app/actions/auth.ts',
        'src/app/actions/business.ts',
        'src/app/actions/review.ts',
        'src/lib/auth-helpers.ts',
        'src/lib/dashboard-queries.ts',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});

// Performance test configuration
const performanceTestConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'performance',
    include: [
      '../../src/lib/__tests__/cache.test.ts',
      '../../src/lib/__tests__/data-fetching.test.ts',
      '../../src/components/**/__tests__/*performance*.test.{ts,tsx}',
    ],
    hookTimeout: 60000,
    testTimeout: 120000,
  },
});

// Accessibility test configuration
const accessibilityTestConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    name: 'accessibility',
    include: [
      '../../src/components/**/__tests__/*a11y*.test.{ts,tsx}',
      '../../src/components/ui/__tests__/*.test.{ts,tsx}',
    ],
    setupFiles: ['./setup-a11y.ts'],
  },
});

// Export all configurations
export {
  unitTestConfig as default,
  integrationTestConfig,
  criticalTestConfig,
  performanceTestConfig,
  accessibilityTestConfig,
};

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/lib/__tests__/simple-test.test.ts'],
  },
})
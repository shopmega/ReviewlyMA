# Unit Testing Setup Guide

## Overview

This project now includes comprehensive unit testing using **Vitest**, a fast and modern testing framework that works seamlessly with Next.js and TypeScript.

## Setup

### Installation

The required dependencies have been added to `package.json`:
- `vitest` - Testing framework
- `@vitejs/plugin-react` - React support for Vitest
- `@vitest/coverage-v8` - Code coverage reporting

Install dependencies:
```bash
npm install
```

## Running Tests

### Run all unit tests
```bash
npm run test
```

### Run tests once (CI mode)
```bash
npm run test:unit
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run E2E tests (Playwright)
```bash
npm run test:e2e
```

## Test Structure

Tests are organized in `src/lib/__tests__/` directory:

```
src/lib/__tests__/
├── logger.test.ts           - Logger service tests
├── errors.test.ts           - Error handling tests
├── rate-limiter.test.ts     - Rate limiting tests
├── utils.test.ts            - Utility functions tests
├── types-validation.test.ts  - Zod schema validation tests
├── data-helpers.test.ts      - Data transformation tests
├── email-service.test.ts     - Email service tests
├── cache.test.ts             - Cache utilities tests
└── auth-helpers.test.ts      - Auth helper tests
```

## Test Coverage

### Current Coverage Areas

1. **Logger Service** (`logger.test.ts`)
   - Log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
   - Context logging
   - Error handling
   - Server-side logging

2. **Error Handling** (`errors.test.ts`)
   - Error response creation
   - Success response creation
   - Database error handling
   - Validation error handling
   - Authentication/authorization errors

3. **Rate Limiter** (`rate-limiter.test.ts`)
   - Rate limit checking
   - Attempt recording
   - Block duration
   - Window expiration
   - Different configurations

4. **Validation Schemas** (`types-validation.test.ts`)
   - Review schema validation
   - Login/signup schemas
   - Password update validation
   - Business update validation

5. **Data Helpers** (`data-helpers.test.ts`)
   - Storage URL construction
   - Path extraction
   - Postgres array parsing

6. **Utilities** (`utils.test.ts`)
   - Class name merging (cn)
   - Image URL validation

7. **Email Service** (`email-service.test.ts`)
   - Email sending
   - Template generation
   - Error handling

8. **Cache Utilities** (`cache.test.ts`)
   - Cache invalidation
   - Cache tags and keys

## Writing New Tests

### Test File Naming
- Place test files next to the code they test: `src/lib/__tests__/module.test.ts`
- Or use the pattern: `module.test.ts` or `module.spec.ts`

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  describe('Function Name', () => {
    it('should do something', () => {
      const result = functionToTest();
      expect(result).toBe(expected);
    });

    it('should handle errors', () => {
      expect(() => functionToTest()).toThrow();
    });
  });
});
```

### Mocking

```typescript
// Mock a module
vi.mock('../module', () => ({
  functionToMock: vi.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock console
const consoleSpy = vi.spyOn(console, 'log');
```

## Configuration

### Vitest Config (`vitest.config.ts`)

- **Environment**: Node.js (for server-side tests)
- **Setup File**: `src/test/setup.ts` (runs before all tests)
- **Coverage**: V8 provider with HTML, JSON, and text reports
- **Path Aliases**: Supports `@/*` imports

### Test Setup (`src/test/setup.ts`)

- Mocks Next.js modules (`next/cache`, `next/headers`)
- Sets up test environment variables
- Configures global test utilities

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Descriptions**: Use descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't test external services
5. **Test Edge Cases**: Include boundary conditions
6. **Keep Tests Fast**: Unit tests should run quickly

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run unit tests
  run: npm run test:unit

- name: Run tests with coverage
  run: npm run test:coverage
```

## Coverage Goals

- **Current**: ~30% (core utilities)
- **Target**: 70%+ (all utilities, helpers, and core logic)
- **Exclude**: UI components (covered by E2E tests), mock data, config files

## Next Steps

1. Add tests for server actions
2. Add tests for data transformation functions
3. Add tests for business logic
4. Increase coverage to 70%+
5. Set up coverage reporting in CI

## Troubleshooting

### Tests not running
- Ensure dependencies are installed: `npm install`
- Check that test files match the pattern: `*.test.ts` or `*.spec.ts`

### Import errors
- Verify path aliases in `vitest.config.ts`
- Check that `tsconfig.json` paths match

### Mock errors
- Ensure mocks are set up in `src/test/setup.ts`
- Check that mocked modules are imported correctly




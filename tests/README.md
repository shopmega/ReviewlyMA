# End-to-End Testing with Playwright

This project includes a comprehensive end-to-end (e2e) testing setup using Playwright to ensure the application works as expected from a user's perspective.

## Setup

The e2e tests are located in the `tests/` directory and use Playwright for browser automation.

### Dependencies

The following dependencies are used for e2e testing:

- `@playwright/test`: The main Playwright testing framework
- `@playwright/experimental-ct-react`: For component testing (optional)

### Scripts

The following npm scripts are available for running e2e tests:

- `npm run test`: Runs all e2e tests
- `npm run test:ui`: Runs tests in UI mode with the Playwright Test UI
- `npm run test:report`: Shows the HTML test report

## Test Structure

The tests are organized in the `tests/` directory:

- `homepage.spec.ts`: Tests for the homepage functionality
- `business-page.spec.ts`: Tests for individual business page functionality
- `auth.spec.ts`: Tests for authentication flows (login, signup)
- `dashboard.spec.ts`: Tests for the user dashboard (requires authentication)
- `admin-panel.spec.ts`: Tests for the admin panel (requires admin authentication)
- `basic.spec.ts`: Basic functionality tests

## Running Tests

### Run all tests
```bash
npm run test
```

### Run tests in UI mode
```bash
npm run test:ui
```

### Run a specific test file
```bash
npx playwright test tests/homepage.spec.ts
```

### Run tests in headed mode (for debugging)
```bash
npx playwright test --headed
```

### Run tests on a specific browser
```bash
npx playwright test --project=chromium
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts` and includes:

- Testing on multiple browsers (Chromium, Firefox, WebKit)
- Automatic server startup for testing
- HTML reporter for test results
- Retry mechanism for failed tests
- Trace collection for debugging

## Writing Tests

Tests follow these patterns:

1. Each test file describes a specific feature or page
2. Tests use `test.describe()` to group related tests
3. Page interactions use Playwright's locator system
4. Assertions use Playwright's `expect` API
5. Tests are written in TypeScript for type safety

## Authentication in Tests

For pages requiring authentication (dashboard, admin panel), tests need to handle authentication. This can be done by:

1. Using `page.addInitScript()` to set authentication tokens
2. Performing login steps at the beginning of tests
3. Using Playwright's authentication API for API-based auth

## Best Practices

1. Use meaningful test descriptions
2. Test user journeys, not just individual components
3. Use appropriate locators (prefer role/text over CSS selectors)
4. Handle asynchronous operations properly
5. Keep tests independent and isolated
6. Use test fixtures for common setup/teardown
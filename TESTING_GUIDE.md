# Testing Guide

This document provides an overview of the testing setup and how to run tests for the Avis application.

## Test Setup

The project uses:
- **Vitest**: Test runner
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: DOM matchers for assertions
- **jsdom**: DOM environment for testing React components

## Test Structure

Tests are organized in `__tests__` directories alongside the components they test:

```
src/
├── components/
│   ├── ui/
│   │   ├── __tests__/
│   │   │   ├── button.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   ├── card.test.tsx
│   │   │   ├── badge.test.tsx
│   │   │   ├── form.test.tsx
│   │   │   └── dialog.test.tsx
│   │   └── button.tsx
│   └── shared/
│       ├── __tests__/
│       │   ├── BusinessActions.test.tsx
│       │   └── VoteButtons.test.tsx
│       └── BusinessActions.tsx
└── test/
    └── setup.ts
```

## Running Tests

### Run all tests
```bash
npm run test:unit
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm run test:unit -- src/components/ui/__tests__/button.test.tsx
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage

### Button Component Tests
- ✅ Rendering with different variants (default, destructive, outline, secondary, ghost, link)
- ✅ Size variations (default, sm, lg, icon)
- ✅ Loading state with spinner
- ✅ Icon support
- ✅ User interactions (click, keyboard)
- ✅ Accessibility (aria-label, disabled state)
- ✅ asChild prop for composition
- ✅ HTML attributes forwarding

### Input Component Tests
- ✅ Basic rendering
- ✅ Placeholder and value handling
- ✅ Different input types (text, email, password, number)
- ✅ User interactions (typing, focus, blur)
- ✅ Disabled state
- ✅ Accessibility support
- ✅ Ref forwarding

### Card Component Tests
- ✅ Card rendering
- ✅ CardHeader, CardTitle, CardDescription
- ✅ CardContent and CardFooter
- ✅ Complete card structure

### Badge Component Tests
- ✅ All variants (default, secondary, destructive, outline, success, warning, error, info)
- ✅ Custom styling
- ✅ Accessibility

### Form Component Tests
- ✅ Form rendering with fields
- ✅ Form validation
- ✅ Form submission

### Shared Component Tests
- ✅ BusinessActions component
- ✅ VoteButtons component

## Writing New Tests

### Example: Testing a Button Component

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Best Practices

1. **Test User Behavior**: Focus on what users see and do, not implementation details
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Test Accessibility**: Ensure components are accessible
4. **Mock External Dependencies**: Mock API calls, hooks, and external libraries
5. **Keep Tests Simple**: Each test should verify one behavior
6. **Use Descriptive Names**: Test names should clearly describe what they test

## Mocking

Common mocks are set up in `src/test/setup.ts`:
- Next.js modules (next/navigation, next/image, next/link)
- Lucide React icons
- Environment variables

For component-specific mocks, use `vi.mock()` at the top of your test file.

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that file paths are correct

### Tests timing out
- Increase timeout in test: `it('test', async () => { ... }, { timeout: 5000 })`
- Check for infinite loops or unresolved promises

### React hooks errors
- Ensure components are wrapped in proper providers if needed
- Check that all required context providers are mocked

## Next Steps

- [ ] Add integration tests for complete user flows
- [ ] Add E2E tests with Playwright or Cypress
- [ ] Increase test coverage to 80%+
- [ ] Add visual regression tests
- [ ] Set up CI/CD test automation




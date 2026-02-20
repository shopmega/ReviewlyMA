# CI Critical Suite

This repo now has a CI-safe test contract focused on high-signal paths that should remain stable across content/theme changes.

## Commands

- `npm run test:unit:critical`
  Runs the stable Vitest subset defined in `vitest.critical.config.ts`.

- `npm run test:e2e:critical`
  Runs the stable Playwright contract suite (`tests/ci-critical.spec.ts`) with `playwright.critical.config.ts`.

- `npm run test:ci:critical`
  Runs both critical unit and critical e2e suites.

## Scope

The critical suite validates:

- Public app availability (`/`, `/businesses`)
- Auth page rendering (`/login`, `/signup`)
- Security redirects for protected routes (`/admin`, `/review`)
- Health endpoint response (`/api/health`)

The legacy broader suites are still available (`test:unit`, `test:e2e`) and can be stabilized incrementally without blocking CI.

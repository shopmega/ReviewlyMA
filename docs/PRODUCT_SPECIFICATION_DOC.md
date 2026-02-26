# Product Specification Document (PSD)

This document is the canonical **Product Specification** for AVis. It is used by TestSprite for test planning and execution. A condensed PRD for TestSprite runs lives under `testsprite_tests/tmp/prd_files/prd.md` and should be kept in sync with this PSD.

## 1. Product Overview
AVis is a web platform for discovering businesses, reading/writing reviews, and enabling business owners to manage reputation and growth through a pro dashboard. The platform includes a public user experience, authenticated user features, and an internal admin console.

## 2. Objectives
- Help users find trustworthy local businesses.
- Increase quality and volume of authentic reviews.
- Provide business users with actionable analytics and premium tooling.
- Enable admins to moderate content and manage platform operations safely.

## 3. Personas
- Visitor: browses businesses, categories, cities, and public content.
- Registered User: writes reviews, manages profile, saves businesses.
- Business/Pro User: accesses dashboard, messages, analytics, premium tools.
- Admin: manages users, businesses, categories, moderation, and settings.

## 4. Core Scope
### Public
- Home, category, city, and business discovery pages.
- Business detail pages and review browsing.
- Authentication entry points (login/signup/forgot/reset).

### Authenticated User
- Submit/edit reviews.
- Profile management and saved businesses.
- Access to user-specific areas.

### Pro Dashboard
- Business dashboard home and modules (reviews, analytics, messages, premium, support).
- Premium feature access and management.

### Admin Console
- Admin landing and sectioned management pages (users, businesses, categories, moderation, diagnostics, settings, payments, content).

## 5. Out of Scope (Current Baseline)
- Native mobile apps.
- Full external payment-provider end-to-end in local testing without sandbox credentials.
- Multi-region deployment orchestration.

## 6. Functional Requirements
- FR-1: Visitor can search and browse businesses by category/city and open business details.
- FR-2: User can register, log in, recover password, and maintain session.
- FR-3: Authenticated users can create and edit reviews.
- FR-4: Pro users can access dashboard modules and read analytics data.
- FR-5: Admin users can access admin pages and perform management actions.
- FR-6: Public API endpoints for business search and health are available and stable.
- FR-7: Route-level access control is enforced for protected areas.

## 7. Non-Functional Requirements
- NFR-1: Core pages load and render reliably on desktop and mobile.
- NFR-2: Authentication and role-based authorization prevent unauthorized access.
- NFR-3: Key user flows complete without console/runtime blocking errors.
- NFR-4: App is testable in local development on port `9002`.

## 8. Key Routes
- `/`
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/businesses`, `/businesses/[slug]`
- `/categories`, `/categorie/[categorySlug]`, `/ville/[citySlug]`
- `/review`, `/reviews/[id]/edit`
- `/dashboard`, `/dashboard/reviews`, `/dashboard/analytics`, `/dashboard/premium`, `/dashboard/messages`
- `/profile`, `/profile/settings`, `/profile/saved-businesses`
- `/admin`, `/admin/utilisateurs`, `/admin/etablissements`, and other admin subsections

## 9. API / Server Interfaces (Representative)
- `GET /api/health`
- `GET /api/businesses/search`
- `GET /api/v1/businesses/search`
- `GET /api/admin/users/search`
- `GET /api/admin/businesses/search`
- Server actions under `src/app/actions/*` for auth, reviews, admin, analytics, premium, support, and related flows.

## 10. User Journeys (Acceptance Level)
- UJ-1 Visitor Discovery: open home -> search/filter -> open business page.
- UJ-2 Auth Flow: signup/login -> session active -> logout/login persistence verified.
- UJ-3 Review Flow: authenticated user submits review -> review appears in relevant listing/detail context.
- UJ-4 Dashboard Flow: pro user opens dashboard modules and views expected data panels.
- UJ-5 Admin Flow: admin opens admin sections and can execute read/update management operations.

## 11. Success Metrics
- Search-to-business-detail CTR.
- New review submissions per active user.
- Dashboard module engagement for pro users.
- Admin moderation turnaround time.
- Auth conversion and login success rate.

## 12. Risks and Constraints
- Third-party dependencies (auth, backend services) may impact test determinism.
- Data/state differences between environments can affect admin/pro scenarios.
- Protected flows require valid seeded accounts/roles.

## 13. TestSprite Readiness Criteria
- Local app running at `http://localhost:9002`.
- Valid TestSprite `API_KEY` configured in MCP.
- Baseline code summary and PRD context available under `testsprite_tests/tmp`.
- Smoke validation for public, auth, dashboard, and admin critical flows.

### Running tests with TestSprite
1. **Start the app**: `npm run dev` (port 9002).
2. **Config**: TestSprite uses `testsprite_tests/tmp/config.json` (set `type` to `"frontend"` for UI tests). Root configs: `testsprite.json` (frontend) and `testsprite.config.json` (e2e); both reference this PSD via `productSpec`: `docs/PRODUCT_SPECIFICATION_DOC.md`.
3. **Generate frontend test plan** (if missing): use MCP tool `testsprite_generate_frontend_test_plan` with `projectPath` and `needLogin: true`. This creates `testsprite_tests/testsprite_frontend_test_plan.json`.
4. **Run tests**: use MCP tool `testsprite_generate_code_and_execute` with `projectName`, `projectPath`, `serverMode: "development"`, and optional `additionalInstruction`. Or run the TestSprite CLI: `npx testsprite-mcp generateCodeAndExecute` from the project root.
5. **Reports**: raw report is written to `testsprite_tests/tmp/raw_report.md`; a completed report can be generated into `testsprite_tests/testsprite-mcp-test-report.md` using the template referenced in the MCP flow.

## 14. Open Items
- Confirm canonical seeded test accounts (user, pro, admin).
- Confirm payment sandbox coverage scope.
- Confirm minimum browser matrix for release gates.

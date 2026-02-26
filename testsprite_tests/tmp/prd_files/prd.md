# AVis Product Requirements (Testing Baseline)

Derived from the canonical [Product Specification Document](../../../docs/PRODUCT_SPECIFICATION_DOC.md).

## Goal
Validate critical user journeys for a French business discovery and review platform.

## Primary users
- Visitor
- Authenticated user
- Business/pro dashboard user
- Admin user

## Core journeys
1. Visitor can browse businesses, categories, and detail pages.
2. User can sign up, login, and recover password.
3. Authenticated user can submit and edit reviews.
4. Pro user can access dashboard modules and premium screens.
5. Admin can access admin console and manage users/businesses.

## Critical pages
- /
- /login
- /signup
- /businesses
- /businesses/[slug]
- /dashboard
- /dashboard/reviews
- /dashboard/premium
- /admin
- /admin/utilisateurs
- /admin/etablissements

## Test constraints
- Prefer non-destructive read flows for production-like data.
- Validate core navigation, rendering, and form behavior.
- Skip third-party payment completion if sandbox credentials are unavailable.

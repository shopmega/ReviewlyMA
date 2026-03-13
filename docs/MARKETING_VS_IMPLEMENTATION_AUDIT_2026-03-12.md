# Marketing vs Implementation Audit

Date: 2026-03-12
Scope: public positioning, pricing promises, premium entitlements, information architecture, and naming consistency

## Executive Summary

The app is not vaporware. Core product surfaces are implemented:

- business discovery
- reviews
- salaries
- referrals
- pro dashboard
- admin

The main issue is packaging drift, not absence of product.

The most serious gaps are:

1. premium pricing promises exceed current entitlement logic
2. messaging is marketed as partially available on Basic but is implemented as premium-only
3. SKU naming and brand naming are inconsistent across public and authenticated surfaces
4. newer salary/referral "intelligence" positioning is partly live in content and SEO, but some linked hubs are still transitional

## Audit Method

This audit compared:

- public marketing pages
- navigation and metadata
- premium gating logic
- dashboard behavior
- tests that encode product assumptions

The goal was to identify where the app promise, plan packaging, or strategic positioning no longer matches the shipped implementation.

## Findings

### 1. Multi-business promise is not implemented

Severity: Critical

Public marketing promises Gold or Premium users can manage up to 5 businesses.

Evidence:

- `src/app/pour-les-pros/page.tsx` markets "Multi-business management (up to 5)"
- `src/app/pour-les-pros/page.tsx` markets "Up to 5 businesses" in the multi-business section
- `src/lib/tier-utils.ts` returns `1` for `growth`, `gold`, and `standard`
- `src/app/actions/premium.ts` derives `maxBusinesses` from `getMaxBusinessesForTier`
- `src/app/actions/__tests__/premium.test.ts` explicitly expects paid users to still get `maxBusinesses === 1`

Impact:

- clear pricing credibility problem
- enterprise/group buyers are told a capability exists when the system rejects it
- tests currently lock the wrong product rule in place

Interpretation:

This is not a stale edge case. The current implementation and tests both enforce the single-business limit.

Recommendation:

- either implement true multi-business entitlements for Gold/Premium
- or remove the "up to 5 businesses" promise from pricing, FAQ, and localized copy immediately

### 2. Basic messaging promise does not match the product

Severity: Critical

The Basic plan claims "Receive messages (limited)", but the real system gates inbox access behind premium.

Evidence:

- `src/app/pour-les-pros/page.tsx` lists Basic feature: "Receive messages (limited)"
- `src/app/actions/messages.ts` blocks non-premium inbox access with `Messagerie reservee aux comptes Premium`
- `src/app/dashboard/messages/page.tsx` renders the whole messaging area as locked when premium is absent

Important nuance:

- visitors can send inbound messages to a business through the public contact dialog
- business-side access to read/manage/reply is premium-only

Impact:

- pricing copy implies free inbound messaging utility
- actual operator experience is "locked until upgrade"
- this creates avoidable frustration at the exact point of monetization

Recommendation:

- choose one model and align everything to it
- option A: Basic can truly receive and read a limited number of messages
- option B: rewrite Basic copy to say contact requests are available only after upgrade

### 3. Feature gates are inconsistent across the app

Severity: High

Some dashboard logic grants access if either the profile tier or the business tier is paid, while shared gating components only inspect `profile.tier`.

Evidence:

- `src/app/dashboard/page.tsx` computes premium and gold access from `profileData?.tier` or `business?.tier`
- `src/components/shared/PremiumFeatureGate.tsx` checks only `profile?.tier`
- `src/app/dashboard/analytics/page.tsx` uses `PremiumFeatureGate` for Gold analytics modules

Impact:

- same user can appear entitled in one area and locked in another
- creates "I paid but feature still locked" support incidents
- undermines confidence in plan upgrades

Recommendation:

- centralize entitlement resolution
- every gate should use the same source of truth:
  profile tier, business tier, admin override, expiry state

### 4. Plan naming is drifting

Severity: High

The app uses `Growth`, `Gold`, `Premium`, and `PRO` as overlapping or conflicting labels.

Evidence:

- `src/app/pour-les-pros/page.tsx` prices `Basic`, `Business Growth`, and `Business Gold`
- `src/components/shared/PremiumFeatureGate.tsx` labels non-Gold paid access as "Premium"
- `src/app/dashboard/support/page.tsx` FAQ asks "difference between Growth and PRO?"
- messaging UI labels premium as `PREMIUM`

Impact:

- users cannot tell whether these are different SKUs or aliases
- internal teams risk writing contradictory copy and support answers
- billing and entitlement communication becomes error-prone

Recommendation:

- define one canonical pricing vocabulary
- update public pages, dashboard copy, emails, support FAQ, and translations to match

Suggested decision:

- `Basic`, `Growth`, `Gold`
- use `paid`, `premium`, or `pro` only as internal umbrella adjectives, not public SKU labels

### 5. Brand naming is drifting

Severity: High

The product is referred to as `AVis`, `Reviewly MA`, `Platform`, and `CityGuide App`.

Evidence:

- `docs/PRODUCT_SPECIFICATION_DOC.md` defines the product as AVis
- `src/app/parrainages/page.tsx` uses `Reviewly MA` metadata
- `src/app/opengraph-image.tsx` uses `AVis`
- `src/app/api/og/company/route.tsx` uses `AVis - Entreprises`
- `src/app/layout.tsx` defaults the site title to `CityGuide App`
- `src/lib/site-config.ts` defaults site name to `Platform`

Impact:

- major trust leak in SEO, social cards, and app chrome
- looks like a rebrand half-applied
- makes screenshots and shared links feel inconsistent or unprofessional

Recommendation:

- choose one canonical brand name
- treat all other labels as legacy placeholders and remove them
- update metadata fallbacks first because they are publicly visible even when site settings are incomplete

### 6. The strategic story is fragmented

Severity: Medium

The app currently presents at least three overlapping product stories:

1. company review and trust platform
2. salary intelligence platform
3. referral demand and referral marketplace platform

Evidence:

- `src/components/shared/HomeClient.tsx` hero focuses on understanding a company before joining it through reviews, salaries, and reputation
- `src/components/layout/Header.tsx` gives referrals top-level nav weight alongside businesses and salaries
- `src/app/blog/page.tsx` positions the editorial hub around referral demand, salary intelligence, company targeting, and reports
- `src/app/referral-demand/page.tsx` positions a live referral-demand intelligence dashboard

Impact:

- users may not understand the core product in the first session
- acquisition channels can land people in different product narratives
- internal prioritization gets harder because the "main thing" is unclear

Recommendation:

- define one primary umbrella statement
- define how the other modules support that umbrella

Example umbrella:

"AVis helps candidates evaluate Moroccan employers through reviews, salaries, and referral signals."

This keeps referrals and salaries additive instead of looking like separate products.

### 7. Some new intelligence hubs are still transitional, but already part of the outward story

Severity: Medium

The newer `/salary` and `/companies` routes are publicly reachable and linked conceptually from blog/content, but they still present themselves as transitional migration hubs.

Evidence:

- `src/app/salary/page.tsx` says the salary architecture is in transition and sends users back to `/salaires`
- `src/app/companies/page.tsx` says the company cluster is still a transition and points users back to `/parrainages`
- `src/app/blog/page.tsx` already frames these clusters as part of the current topical authority structure

Impact:

- users who arrive from content or search can hit pages that feel unfinished
- the new information architecture is visible before it feels productized
- this weakens credibility for the "intelligence hub" narrative

Recommendation:

- either keep these routes hidden from the main strategic story until ready
- or upgrade them from migration stubs into proper user-facing landing pages

### 8. Marketing copy and implementation appear to be drifting faster than automated checks

Severity: Medium

Current tests mainly confirm route availability and protection, not truthfulness of claims.

Evidence:

- `tests/monetization.spec.ts` checks that `/pour-les-pros` loads and that premium/admin routes are protected
- `tests/claiming.spec.ts` checks pro landing and signup reachability
- `src/app/actions/__tests__/premium.test.ts` actively validates the single-business cap

Impact:

- misleading pricing and entitlement copy can ship without failing CI
- tests protect technical stability, not product honesty

Recommendation:

- add product contract tests for pricing/entitlement consistency
- examples:
  - if Gold promises 5 businesses, entitlement helper must return 5
  - if Basic promises limited inbox, non-paid users must at least read inbound messages

## Positioning Assessment

### What the app currently is

A candidate/employer-insight platform with four real pillars:

- employer reviews
- salary transparency
- referral marketplace and demand signals
- business reputation tools

### What the app currently sounds like

A mix of:

- business directory
- employer review platform
- salary barometer
- referral intelligence network
- pro SaaS suite

### Positioning risk

The product has expanded faster than its packaging model.

This is not necessarily bad. The issue is that the app has not yet been re-articulated as one coherent product. Users are likely to understand individual modules, but not the product system.

## Priority Recommendations

### P0: Fix promise integrity

Do immediately:

- remove or implement "up to 5 businesses"
- remove or implement "Receive messages (limited)" for Basic
- unify Growth / Gold / Premium / PRO naming

Why:

These are direct promise-to-product mismatches at the pricing and upgrade layer.

### P1: Unify entitlement logic

Do next:

- create one entitlement resolver
- make all feature gates use it
- include profile tier, business tier, admin access, and expiration

Why:

This removes inconsistent lock states and reduces support burden.

### P1: Normalize public brand identity

Do next:

- pick one canonical brand
- update metadata defaults
- update OG image generators
- remove `Platform` and `CityGuide App` fallbacks

Why:

These names leak in public surfaces even when configuration is incomplete.

### P2: Decide whether intelligence hubs are product or migration

Do after packaging fixes:

- if product: upgrade `/salary` and `/companies` into real landing pages
- if migration: stop framing them as current pillars in public copy until complete

Why:

This is more strategic than urgent, but it affects acquisition quality and trust.

### P2: Write a canonical product narrative

Recommended one-liner:

"AVis helps candidates evaluate employers in Morocco through reviews, salaries, and referral signals."

Supporting layers:

- Reviews answer: what people experience
- Salaries answer: what the market pays
- Referrals answer: where access and demand exist
- Pro tools answer: how businesses manage reputation and attract talent

## Suggested Backlog

### Engineering

- replace `getMaxBusinessesForTier` with real commercial limits
- refactor `PremiumFeatureGate` to use centralized entitlements
- add consistency tests for pricing promises vs entitlement behavior
- audit all locked feature modules for profile-tier-only checks

### Product

- finalize SKU naming
- decide real messaging access model for Basic
- decide whether multi-business is a roadmap item or current offer
- define one primary positioning sentence

### Content

- rewrite pricing page to match live entitlements
- update support FAQ and translated pricing strings
- standardize metadata brand name
- either finish or soften references to transitional intelligence hubs

## Bottom Line

The app already delivers meaningful product value.

The main problem is that its monetization and strategic packaging have drifted away from the current implementation.

If fixed, the product will feel much more trustworthy without needing a major rebuild.

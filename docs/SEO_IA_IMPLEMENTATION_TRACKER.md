# SEO IA Implementation Tracker

Last updated: 2026-02-28
Owner: Growth + Product + Engineering
Status: In progress

## Goal
Implement the revised SEO information architecture without cannibalizing existing pages, and roll out cluster-based content with measurable conversion impact.

## Target IA
- `/referral-demand/*` for referral demand intelligence pages.
- `/salary/*` for salary intelligence pages.
- `/companies/*` for company referral intent pages.
- `/blog/*` for editorial and how-to content.
- `/reports/*` for periodic market reports.

## Current Production State
- Existing referral marketplace pages are under `/parrainages/*`.
- Existing salary SEO pages are under `/salaires/*`.
- No dedicated `/blog` or `/reports` section currently exists.

## Rollout Strategy
1. Build new IA hubs and templates.
2. Keep legacy routes operational during transition.
3. Prevent overlap with explicit canonical/indexation rules.
4. Move internal linking to new clusters incrementally.

## Canonical and Indexation Rules (Transition)
- Keep current canonical pages on legacy routes until equivalent new pages are production-ready.
- Use `noindex, follow` on placeholder/thin pages.
- Index only pages that pass data thresholds.

## Cutover Flags (Env-Controlled)
- `NEXT_PUBLIC_ENABLE_COMPANY_ROUTE_INDEXING` (default: `false`)
- `NEXT_PUBLIC_ENABLE_SALARY_ROUTE_INDEXING` (default: `false`)
- `NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING` (default: `false`)
- `NEXT_PUBLIC_ENABLE_BLOG_HUB_INDEXING` (default: `true`)
- `NEXT_PUBLIC_PREFER_NEW_COMPANY_ROUTE_CANONICAL` (default: `false`)
- `NEXT_PUBLIC_PREFER_NEW_SALARY_ROUTE_CANONICAL` (default: `false`)
- Runbook: `docs/SEO_IA_CUTOVER_RUNBOOK.md`

## Cluster Backlog

### 1) Referral Demand Intelligence
- [x] Add `/referral-demand` live dashboard hub.
- [x] Add `/referral-demand/[role]/[city]` template.
- [x] Add top roles and top cities landing pages.
- [x] Add data freshness indicators and monthly trend blocks.

### 2) Salary Intelligence
- [x] Add `/salary` hub page.
- [x] Add `/salary/[role]/[city]` template with median, distribution, MoM, seniority split.
- [x] Add indexation threshold guardrail.
- [x] Add cross-links from reports and guides.

### 3) Company Insights
- [x] Add `/companies` hub page.
- [x] Add `/companies/[company]/referrals` template.
- [x] Add activity threshold for indexation.
- [x] Add sentiment aggregation once reviews module is ready.

### 4) Referral Execution Playbooks
- [x] Add `/blog` section.
- [x] Add first pillar page: "What Is Referral Demand? (Complete Guide 2026)".
- [x] Add first 4 how-to guides aligned with demand/salary/company clusters.
- [x] Enforce internal linking policy from every guide to data pages.
- [x] Add admin CMS workflow so non-developers can publish normal articles.

### 5) Periodic Reports
- [x] Add `/reports` hub page.
- [x] Add first monthly report page under `/reports/monthly-referral-report-[month]-[year]`.
- [x] Add report template with links to all cluster pages.

## KPI Tracking
- Organic sessions by directory:
  - `/referral-demand/*`
  - `/salary/*`
  - `/companies/*`
  - `/blog/*`
  - `/reports/*`
- Assisted conversion paths:
  - Blog -> company -> signup
  - Blog -> salary -> listing creation
  - Report -> referral-demand -> listing creation
- Index coverage rate and thin-page noindex compliance.

## Change Log
- 2026-02-28
  - Created implementation tracker.
  - Started Phase 1 with `/referral-demand` live hub implementation.
  - Added transitional hubs: `/blog`, `/reports`, `/salary`, `/companies` (all `noindex, follow`).
  - Added `/referral-demand/[role]/[city]` with threshold-based indexing and sitemap coverage.
  - Added `/companies/[company]/referrals` in transitional noindex mode with canonical to legacy route.
  - Added `/salary/[role]/[city]` in transitional noindex mode with canonical to legacy route and monthly trend parsing.
  - Added `/referral-demand/roles` and `/referral-demand/cities` leaderboards.
  - Added data freshness and cluster cross-links across IA hub pages.
  - Added monthly report template route: `/reports/[reportSlug]` with `monthly-referral-report-<month>-<year>` parsing.
  - Added report sitemap generation for monthly report pages from referral activity buckets.
  - Added blog content system with `/blog/[slug]` route, including one pillar article and four how-to guides.
  - Added required internal cluster links policy for every blog guide (`/referral-demand`, `/salary`, `/companies`, `/reports`).
  - Added blog pages to sitemap generation.
  - Added company review sentiment aggregation on `/companies/[company]/referrals` (sample-size gated, 90-day momentum, recommendation and positive-share signals).
  - Added env-driven cutover controls for canonical and indexing behavior on blog/reports/salary/company routes.
  - Added `.env.example` with SEO IA cutover flags.
  - Added SEO IA cutover runbook with phased rollout, checklist, and rollback plan.
  - Added `npm run check:seo-ia` smoke checker for canonical/robots verification across core IA routes.
  - Added blog CMS foundation (`blog_articles` table + RLS + admin policies).
  - Added `/admin/blog` management page and server actions for create/update/publish/archive/delete.
  - Merged published CMS articles into `/blog` and `/blog/[slug]` rendering with static playbooks fallback.
  - Added published CMS blog slugs to sitemap generation.

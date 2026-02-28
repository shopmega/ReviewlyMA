# SEO IA Cutover Runbook

Last updated: 2026-02-28
Owner: Growth + Product + Engineering

## Purpose
Provide a safe, staged migration path from legacy SEO routes (`/parrainages/*`, `/salaires/*`) to the new IA routes (`/companies/*`, `/salary/*`, `/reports/*`, `/blog/*`) using environment flags.

## Flags
- `NEXT_PUBLIC_ENABLE_COMPANY_ROUTE_INDEXING`
- `NEXT_PUBLIC_ENABLE_SALARY_ROUTE_INDEXING`
- `NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING`
- `NEXT_PUBLIC_ENABLE_BLOG_HUB_INDEXING`
- `NEXT_PUBLIC_PREFER_NEW_COMPANY_ROUTE_CANONICAL`
- `NEXT_PUBLIC_PREFER_NEW_SALARY_ROUTE_CANONICAL`

Default values are in `.env.example`.

## Staged Rollout

### Phase A: Baseline (Current Safe Mode)
- `NEXT_PUBLIC_ENABLE_COMPANY_ROUTE_INDEXING=false`
- `NEXT_PUBLIC_ENABLE_SALARY_ROUTE_INDEXING=false`
- `NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING=false`
- `NEXT_PUBLIC_ENABLE_BLOG_HUB_INDEXING=true`
- `NEXT_PUBLIC_PREFER_NEW_COMPANY_ROUTE_CANONICAL=false`
- `NEXT_PUBLIC_PREFER_NEW_SALARY_ROUTE_CANONICAL=false`

Expected behavior:
- New company/salary IA templates exist but do not compete in index.
- Legacy routes remain canonical for company/salary.
- Blog articles can index.

### Phase B: Canonical Dry Run
- Keep indexing flags `false`.
- Set canonical preference flags `true`:
  - `NEXT_PUBLIC_PREFER_NEW_COMPANY_ROUTE_CANONICAL=true`
  - `NEXT_PUBLIC_PREFER_NEW_SALARY_ROUTE_CANONICAL=true`

Expected behavior:
- Search engines start consolidating canonical preference toward new IA URLs.
- Indexing is still gated on new templates.

### Phase C: Controlled Indexing Enablement
- Keep canonical preference flags `true`.
- Turn on indexing flags:
  - `NEXT_PUBLIC_ENABLE_COMPANY_ROUTE_INDEXING=true`
  - `NEXT_PUBLIC_ENABLE_SALARY_ROUTE_INDEXING=true`
  - Optional: `NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING=true`

Expected behavior:
- New IA company/salary routes can index when threshold logic passes.
- Reports hub can index if enabled.

## Pre-Cutover Checklist
1. Confirm sitemap contains new IA pages and report pages.
2. Confirm noindex/index states match active phase.
3. Confirm canonical tags point to expected route family.
4. Confirm internal links from blog/report pages point to new IA routes.
5. Monitor Search Console for:
   - canonical chosen URL
   - valid indexed pages by directory
   - duplicate without user-selected canonical warnings

## Automated Smoke Check
1. Start the app locally (for example: `npm run dev` on port `9002`).
2. Run: `npm run check:seo-ia`.
3. Optional custom URL: `SITE_URL=https://your-preview-domain npm run check:seo-ia`.

The check validates canonical and robots behavior for core IA hubs and the pillar blog article.

## Rollback Procedure
1. Set all indexing flags to `false`.
2. Set both canonical preference flags to `false`.
3. Redeploy.
4. Re-validate canonical/noindex behavior in rendered HTML.

## Success Criteria
1. New IA directories gain indexed coverage with no duplicate-content spike.
2. Legacy canonical conflicts trend down over 2-4 weeks.
3. Organic clicks increase in `/referral-demand/*`, `/salary/*`, `/companies/*`, `/reports/*`, `/blog/*`.

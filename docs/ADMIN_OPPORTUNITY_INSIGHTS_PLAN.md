# Admin Opportunity Insights Plan

## Goal
Improve admin capabilities to identify high-traction companies, convert claimed businesses to paid tiers, and prioritize outreach for unclaimed businesses.

## Scope
This plan introduces:
- A measurable opportunity scoring model.
- A read model for admin opportunity ranking.
- A lightweight outreach pipeline inside admin.
- Clear data-gap fixes for missing signals.

## Current Signal Inventory (Mapped to Existing Schema)

### Available now (can be used in MVP)
- `business_analytics`:
  - `event_type`: `page_view`, `phone_click`, `website_click`, `contact_form`, `whatsapp_click`, `affiliate_click`
  - Good for traction + intent.
- `reviews`:
  - Rating and review volume trends (`rating`, `created_at`, `business_id`).
- `businesses`:
  - Static reputation baseline (`average_rating`, `review_count`), monetization (`tier`, `is_premium`), ownership hint (`user_id`).
- `saved_businesses`:
  - User save/bookmark behavior (intent/interest signal).
- `business_claims`:
  - Ownership verification state (`status`) and claim activity.

### Partially available
- `analytics_events` has richer data (`session_id`, `event`, `properties`, `business_id`) but business-specific events are not yet consistently normalized for admin opportunity scoring.

### Missing for ideal scoring
- No explicit map-click metric.
- No consistent unique visitors metric per business (current `business_analytics` has no user/session key).
- No outbound CRM table for admin outreach lifecycle.

## Scoring Model (MVP)

Use two scores so actions are clear:
- `upgrade_score` (for claimed/non-premium businesses)
- `acquisition_score` (for unclaimed businesses)

### Derived metrics (30d rolling)
- `views_30d`: count `business_analytics.event_type = 'page_view'`
- `leads_30d`: count `event_type IN ('phone_click','website_click','contact_form','whatsapp_click')`
- `saves_30d`: count rows in `saved_businesses`
- `reviews_30d`: count rows in `reviews`
- `avg_rating_30d`: avg `reviews.rating`
- `lead_rate_30d`: `leads_30d / views_30d`
- `is_claimed`: `businesses.user_id IS NOT NULL` OR approved claim exists

### Sub-scores (0..100)
- `traction_score`:
  - log-scaled views, leads, saves.
- `reputation_score`:
  - average rating + recent review volume.
- `intent_score`:
  - lead rate + high-intent events.

### Final scores
- `upgrade_score`:
  - Stronger weight on intent/reputation for monetization readiness.
- `acquisition_score`:
  - Stronger weight on traction + unclaimed bonus.

### Recommended action rules
- `Outreach (Unclaimed)` if `!is_claimed` and `acquisition_score >= 55`
- `Upgrade (Claimed)` if `is_claimed` and `!is_premium` and `upgrade_score >= 60`
- `Monitor` otherwise

## Admin UX Deliverables

### 1) Opportunity List View
Columns:
- Business, city, category
- Claimed/unclaimed
- Tier/premium status
- Views (30d), leads (30d), saves (30d), reviews (30d), avg rating (30d)
- `upgrade_score`, `acquisition_score`
- Recommended action badge

Filters:
- City, category
- Claimed status
- Tier status
- Score range
- Minimum reviews/leads

### 2) Opportunity Detail Panel
- KPI trend summary (7d/30d)
- Score breakdown (traction/reputation/intent)
- Explainability text: why flagged
- Admin action buttons: `Create Outreach`, `Mark Contacted`, `Mark Converted`

### 3) Outreach Pipeline
Stages:
- `new`
- `contacted`
- `interested`
- `claimed`
- `upgraded`
- `lost`

Track:
- owner admin
- channel (email/phone/linkedin/other)
- last contacted
- next follow-up
- notes

## Data Model Additions
A migration scaffold is provided in:
- `supabase/migrations/20260304101000_admin_opportunity_insights.sql`

It adds:
- `public.business_outreach_pipeline` (CRM-like workflow table)
- `public.admin_business_opportunity_v1` (scored admin view)
- supporting indexes and admin/service policies

## API and Server Actions (Implementation Steps)

### Step A: Read action
Create admin server action:
- `getAdminBusinessOpportunities(filters)`
- source: `admin_business_opportunity_v1`
- supports pagination and sorting by either score

### Step B: Outreach actions
Create actions:
- `createOutreachLead(payload)`
- `updateOutreachStage(id, stage)`
- `assignOutreachOwner(id, adminId)`
- `setOutreachFollowUp(id, date)`

### Step C: Admin route
Add route:
- `/admin/opportunites`

Use existing table/card patterns from:
- `/admin/etablissements`
- `/admin/analytics`

## KPI Tracking (Success Metrics)
- Opportunity-to-contact rate
- Contact-to-claim rate
- Claim-to-paid rate
- Revenue from flagged businesses
- Median days: `new -> claimed` and `new -> upgraded`

## Gaps to Close After MVP
- Add unique visitor tracking per business (session-aware events).
- Add map-click event capture.
- Add model versioning table for score snapshots (`business_opportunity_scores_daily`) for drift monitoring.

## Rollout Plan
1. Deploy migration and build read-only opportunity page.
2. Enable outreach pipeline actions.
3. Add conversion dashboards + cohort tracking.
4. Add enhanced event instrumentation (unique visitors + map clicks).

# Job Offer Analysis Module Plan

## Goal
Create a standalone job offer analysis module that lets users submit a job offer, receive a structured and explainable market analysis, save analyses, and later benefit from aggregate offer intelligence across companies, roles, and cities.

This module is a first-class product area. It is not part of the salary module and not part of the referral module.

## Module Positioning

### Product role
The module answers:
- Is this offer competitive for this role and city?
- Is this offer aligned with company-level market behavior?
- What is missing, risky, or unusually strong in the offer?

### Independence rule
The module owns its own:
- database tables
- analytics views
- server actions
- routes
- UI components
- admin tooling
- moderation workflow

The module may read benchmark data from salaries and company data from businesses/reviews, but those modules must not depend on job offers.

## Core User Value

### For candidates
- Understand whether an offer is below market, fair, or strong.
- Get a structured breakdown instead of reading vague offer text manually.
- See missing details before accepting or negotiating.

### For the platform
- Build a new proprietary data layer around hiring transparency.
- Increase retention with saved analyses and alerts.
- Create future SEO and report surfaces once data quality is sufficient.

### For admins
- Moderate suspicious or low-quality submissions.
- Track offer quality trends by company, role, and city.
- Detect employers or segments with repeated under-market offers.

## Non-Goals for MVP
- Full OCR pipeline for PDF contracts.
- Automatic legal validation of offer clauses.
- Publicly exposing raw private offers by default.
- Personalized AI negotiation coaching.

## Module Boundaries

### This module owns
- Offer ingestion
- Offer normalization
- Offer analysis and scoring
- Offer persistence
- Offer moderation
- Offer analytics and trend views

### External dependencies it can read
- `businesses`
- `reviews`
- `salary_company_metrics`
- `salary_role_city_metrics`
- `salary_city_metrics`

### Explicitly not owned by this module
- Salary submission workflow
- Referral posting workflow
- General business analytics tracking

## Primary User Flows

### Flow 1: Analyze a new offer
1. User opens `/job-offers/analyze`.
2. User fills a structured form and optionally pastes free-text offer details.
3. System normalizes the input into a canonical offer record.
4. System computes benchmark comparisons and analysis scores.
5. User sees a result page with summary, score breakdown, risks, and missing info.

### Flow 2: Save and revisit analyses
1. Authenticated user submits an analysis.
2. Analysis is saved under the user account.
3. User revisits previous analyses in `/job-offers` or dashboard-linked surfaces.

### Flow 3: Compare market context
1. User opens company or role/city offer pages.
2. User sees aggregate offer indicators, benchmark range, and quality trends.
3. User uses this context before applying, negotiating, or accepting.

### Flow 4: Admin moderation
1. Admin reviews new or flagged offers.
2. Admin changes status, leaves notes, or rejects low-quality/spam entries.
3. Only approved records contribute to aggregate public metrics.

## MVP Feature Set

### User-facing
- Standalone analyze page
- Structured offer submission form
- Optional free-text paste area
- Offer result page with explainable scoring
- Save analysis for authenticated users
- Private history list for submitted analyses

### Analysis output
- `overall_offer_score`
- `compensation_score`
- `market_alignment_score`
- `transparency_score`
- `quality_score`
- `risk_flags`
- `missing_information`
- `strengths`
- `recommendation_label`
- `confidence_level`

### Admin-facing
- Offer moderation queue
- Offer detail review panel
- Status management
- Basic aggregate analytics for submissions and approval rates

## Future Feature Set

### Candidate intelligence
- Offer comparison between two analyses
- Salary negotiation hints
- Alerts for strong offers in a tracked role/city
- Personalized fit scoring using profile and target salary

### Public intelligence
- Company offer pages
- Role/city offer intelligence pages
- Monthly offer market reports
- Top companies by transparency score

### Data enrichment
- AI-assisted free-text extraction
- OCR for uploaded documents
- Contract-type and benefits extraction from pasted content

## Route Map

### Public or authenticated module routes
- `/job-offers`
- `/job-offers/analyze`
- `/job-offers/history`
- `/job-offers/[analysisId]`
- `/job-offers/company/[companySlug]`
- `/job-offers/role/[roleSlug]/[citySlug]`

### Admin routes
- `/admin/job-offers`
- `/admin/job-offers/moderation`
- `/admin/job-offers/analytics`
- `/admin/job-offers/settings`

### Dashboard integration points
- `/dashboard/job-offers`

The dashboard entry should be a consumer of the module, not its canonical home.

## Proposed Frontend Structure

### App routes
- `src/app/job-offers/page.tsx`
- `src/app/job-offers/analyze/page.tsx`
- `src/app/job-offers/history/page.tsx`
- `src/app/job-offers/[analysisId]/page.tsx`
- `src/app/job-offers/company/[companySlug]/page.tsx`
- `src/app/job-offers/role/[roleSlug]/[citySlug]/page.tsx`
- `src/app/dashboard/job-offers/page.tsx`
- `src/app/(admin)/admin/job-offers/page.tsx`
- `src/app/(admin)/admin/job-offers/moderation/page.tsx`
- `src/app/(admin)/admin/job-offers/analytics/page.tsx`

### Components
- `src/components/job-offers/JobOfferAnalysisForm.tsx`
- `src/components/job-offers/JobOfferAnalysisResult.tsx`
- `src/components/job-offers/JobOfferScoreCard.tsx`
- `src/components/job-offers/JobOfferRiskList.tsx`
- `src/components/job-offers/JobOfferHistoryTable.tsx`
- `src/components/job-offers/JobOfferModerationTable.tsx`

### Domain logic
- `src/app/actions/job-offers.ts`
- `src/lib/data/job-offers.ts`
- `src/lib/job-offers/scoring.ts`
- `src/lib/job-offers/normalization.ts`
- `src/lib/job-offers/benchmarks.ts`
- `src/lib/job-offers/constants.ts`

## Data Model

### Table: `job_offers`
Canonical normalized offer input.

Suggested fields:
- `id uuid primary key`
- `user_id uuid null`
- `business_id text null`
- `company_name text not null`
- `job_title text not null`
- `job_title_normalized text null`
- `city text null`
- `city_slug text null`
- `salary_min numeric null`
- `salary_max numeric null`
- `salary_currency text not null default 'MAD'`
- `pay_period text not null`
- `contract_type text null`
- `work_model text null`
- `seniority_level text null`
- `years_experience_required numeric null`
- `benefits jsonb not null default '[]'::jsonb`
- `source_text text null`
- `source_type text not null default 'manual'`
- `status text not null default 'pending'`
- `visibility text not null default 'private'`
- `submitted_at timestamptz not null default now()`
- `approved_at timestamptz null`
- `rejected_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Table: `job_offer_analyses`
Immutable or versioned computed output for an offer.

Suggested fields:
- `id uuid primary key`
- `job_offer_id uuid not null references job_offers(id) on delete cascade`
- `analysis_version text not null`
- `overall_offer_score numeric not null`
- `compensation_score numeric not null`
- `market_alignment_score numeric not null`
- `transparency_score numeric not null`
- `quality_score numeric not null`
- `market_position_label text not null`
- `confidence_level text not null`
- `benchmark_role_city_median numeric null`
- `benchmark_company_median numeric null`
- `benchmark_city_median numeric null`
- `risk_flags jsonb not null default '[]'::jsonb`
- `missing_information jsonb not null default '[]'::jsonb`
- `strengths jsonb not null default '[]'::jsonb`
- `analysis_summary text not null`
- `created_at timestamptz not null default now()`

### Table: `job_offer_moderation_events`
- `id uuid primary key`
- `job_offer_id uuid not null references job_offers(id) on delete cascade`
- `admin_user_id uuid not null references profiles(id)`
- `event_type text not null`
- `notes text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

### Table: `job_offer_reports`
Optional for abuse reporting once records become visible beyond private history.

### Views or materialized views
- `job_offer_company_metrics`
- `job_offer_role_city_metrics`
- `job_offer_city_metrics`
- `job_offer_quality_signals_v1`

These should only aggregate approved and visibility-eligible offers.

## Suggested Status Model

### Offer status
- `pending`
- `approved`
- `rejected`
- `flagged`

### Visibility
- `private`
- `aggregate_only`
- `public`

### Source type
- `manual`
- `paste`
- `import`
- `api`

## Scoring Model

### Principle
Scores must be explainable and deterministic. No black-box output should be shown without a visible breakdown.

### Sub-scores
- `compensation_score`
  Measures where the offer sits versus role/city and company benchmarks.
- `market_alignment_score`
  Measures consistency with observed market data and expected ranges.
- `transparency_score`
  Rewards disclosed salary, narrow ranges, explicit benefits, clear contract type, and clear work model.
- `quality_score`
  Penalizes vague title, unrealistic requirements, missing pay information, or suspiciously broad role scope.

### Derived labels
- `below_market`
- `fair_market`
- `above_market`
- `strong_offer`

### Confidence
Confidence should depend on:
- benchmark sample size
- benchmark recency
- amount of structured offer data present
- company match quality

Suggested labels:
- `low`
- `medium`
- `high`

## Benchmark Strategy

### First benchmark sources
1. `salary_role_city_metrics`
2. `salary_company_metrics`
3. `salary_city_metrics`

### Fallback order
If company-level sample is too weak:
1. use role/city median
2. then city median
3. then role-only approximation if later introduced

### Hard rule
Low-confidence benchmarks must not present precise or overconfident messaging.

## Server Actions

Create `src/app/actions/job-offers.ts` with:
- `submitJobOfferAnalysis(input)`
- `saveJobOfferDraft(input)`
- `getMyJobOfferAnalyses(filters)`
- `getJobOfferAnalysisById(id)`
- `moderateJobOffer(id, decision, notes)`
- `flagJobOffer(id, reason, details)`
- `getAdminJobOffers(filters)`
- `getAdminJobOfferAnalytics(filters)`

Keep write paths isolated in this module instead of extending salary or referral actions.

## Data Access Layer

Create `src/lib/data/job-offers.ts` with:
- `getJobOfferById(id)`
- `getJobOfferAnalysisById(id)`
- `getJobOfferCompanyMetrics(companySlug)`
- `getJobOfferRoleCityMetrics(roleSlug, citySlug)`
- `getMyJobOfferAnalyses(userId, filters)`
- `getAdminJobOfferQueue(filters)`

## Type System

Extend `src/lib/types.ts` with:
- `JobOfferSubmissionInput`
- `JobOfferRecord`
- `JobOfferAnalysisRecord`
- `JobOfferRiskFlag`
- `JobOfferRecommendationLabel`
- `JobOfferCompanyMetrics`
- `JobOfferRoleCityMetrics`

Validation should follow existing schema patterns already used for salaries and reviews.

## Admin UX

### Moderation list
Columns:
- company
- role
- city
- salary range
- source type
- status
- visibility
- confidence
- overall score
- created date

### Moderation detail
Sections:
- raw submission
- normalized data
- score breakdown
- benchmark inputs
- moderation history
- action buttons

### Admin analytics
KPIs:
- total submissions
- approval rate
- rejection rate
- median offer score
- offers missing salary
- companies with repeated weak offers

## Privacy and Safety Rules

### Privacy defaults
- New submissions default to `private`.
- Aggregate analytics must exclude records that should remain private.
- Raw source text should not become public without explicit policy and sanitization.

### Abuse controls
- rate limiting on submission
- duplicate detection
- spam heuristics
- admin moderation before public aggregation if needed

### Trust rules
- Every visible score must include explanation text.
- Missing data must be surfaced explicitly.
- Confidence level must be displayed next to benchmark-driven recommendations.

## SEO and Discoverability

### MVP
- Keep indexable surfaces off by default except the top-level explainer page if desired.
- Do not ship role/city or company SEO pages until approved sample sizes are sufficient.

### Later
- `/job-offers/company/[companySlug]`
- `/job-offers/role/[roleSlug]/[citySlug]`
- monthly reports under `/reports`

This should follow the same threshold-based publishing logic already used by salary and referral intelligence pages.

## Analytics and Instrumentation

Track:
- analysis started
- analysis completed
- analysis saved
- result shared
- history viewed
- offer flagged
- admin approval
- admin rejection

These events should be module-specific and not mixed into salary event names.

## Rollout Plan

### Phase 1: Private analyzer
- create schema
- create scoring engine
- ship `/job-offers/analyze`
- save private analyses
- add dashboard history page

### Phase 2: Moderation and aggregation
- admin moderation queue
- aggregate metrics views
- company and role/city analytics consumers
- reporting and abuse workflows

### Phase 3: Public intelligence
- public company offer pages
- public role/city pages
- reports and trend pages
- alerts and saved watches

## Acceptance Criteria for MVP
- User can submit a structured job offer from `/job-offers/analyze`.
- System stores a normalized offer and a computed analysis record.
- Result page shows overall score, sub-scores, recommendation label, risks, and missing information.
- Authenticated user can view previous analyses.
- Admin can review pending submissions and approve or reject them.
- Module logic and routes live in dedicated `job-offers` code paths.
- Salary and referral modules remain unchanged except for optional read-only integration points.

## Implementation Notes for This Repo

### Reuse
- Follow migration style used in [20260304101000_admin_opportunity_insights.sql](C:/Users/Zouhair/Downloads/AVis-prod/supabase/migrations/20260304101000_admin_opportunity_insights.sql).
- Follow data-access conventions in [salaries.ts](C:/Users/Zouhair/Downloads/AVis-prod/src/lib/data/salaries.ts).
- Follow admin server action structure in [admin-opportunities.ts](C:/Users/Zouhair/Downloads/AVis-prod/src/app/actions/admin-opportunities.ts).

### Do not reuse as host modules
- Do not place this under salary routes.
- Do not place this under referral routes.
- Do not overload salary submission tables for offer ingestion.

## Recommended Next Implementation Step
Create the first migration and type definitions:
- `supabase/migrations/<timestamp>_create_job_offer_analysis_module.sql`
- `src/lib/types.ts` additions
- `src/lib/job-offers/*` scoring and normalization skeleton
- `src/app/actions/job-offers.ts`

# Reviews Module Execution Spec (3 Sprints)

Date: 2026-02-27
Product: Reviewly MA
Owner: Product + Eng + Trust/Safety
Scope: Reviews flow only (discover, read, write, lifecycle, moderation, owner interactions)

## 1) Goals and Non-Goals

### Goals
- Increase trusted review volume.
- Reduce legal risk (defamation, doxxing, retaliation).
- Improve repeat contribution (second review + annual updates).
- Make moderation auditable and SLA-driven.

### Non-Goals
- No full redesign of non-review modules.
- No full Arabic localization in MVP (FR first).
- No major rewrite of existing auth stack.

## 2) Current-State Gaps to Fix

- Review object is too thin for credibility (missing role/tenure/work mode/status context).
- Moderation classifier only outputs spam/fake, not legal-risk categories.
- Report reasons are too narrow.
- Review list has weak filtering and weak trust cues.
- State machine is too coarse (`pending/published/rejected/deleted`).
- Rate limiting is in-memory and easy to bypass at scale.

## 3) Delivery Plan by Sprint

## Sprint 1 (Trust Baseline + Data Foundation)
Duration: 2 weeks

### Outcomes
- Expanded review schema and normalization fields.
- New moderation state machine and audit trail tables.
- New report reason taxonomy.
- UI copy corrections and minimal trust disclosures.

### DB Migrations (draft names)
1. `20260301_reviews_schema_v2_core.sql`
2. `20260301_create_review_versions.sql`
3. `20260301_create_review_moderation_events.sql`
4. `20260301_expand_review_reports_reasons.sql`
5. `20260301_review_k_anonymity_helpers.sql`

### Backend/API
- Upgrade review create/update APIs to accept structured context fields.
- Add server-side policy checks for PII/defamation pre-screen.
- Add status transitions with reason codes.

### Frontend
- Replace misleading trust copy.
- Add review card credibility chips (employment status, role family, tenure, city, date).
- Add moderation status badge for author-owned reviews in profile.

### Acceptance Criteria
- New reviews cannot be created without required context fields.
- Every moderation action writes an immutable moderation event.
- Report dialog includes expanded reason list.
- Company page trust text no longer claims verification that does not exist.

## Sprint 2 (Write Experience + Moderation Ops)
Duration: 2 weeks

### Outcomes
- Multi-step write-review wizard.
- Enhanced moderation queue with typed queues and SLA timers.
- Appeals flow for users and owner dispute requests.

### DB Migrations (draft names)
1. `20260315_add_review_appeals_and_disputes.sql`
2. `20260315_add_review_sla_columns.sql`
3. `20260315_add_review_risk_signals.sql`

### Backend/API
- Introduce explicit transition API (`/api/reviews/{id}/transition`).
- Introduce moderation queue endpoints (`/api/moderation/reviews`).
- Add risk-score computation pipeline hooks.

### Frontend
- Wizard steps:
  - Context
  - Ratings
  - Experience
  - Privacy and Submit
- Moderator console upgrades:
  - Bulk actions
  - Quick reason templates
  - Queue filters and SLA sort
- Owner dispute submission from dashboard.

### Acceptance Criteria
- Edit creates a new review version and forces `edited_requires_review`.
- Moderator cannot resolve without reason code.
- Appeal flow available and visible to affected user.

## Sprint 3 (Retention + Anti-Abuse Hardening)
Duration: 2 weeks

### Outcomes
- Return loops (annual reminder, contributor impact metrics).
- Fraud detection and throttles hardening.
- Cross-module conversion prompts (review -> salary, salary -> review).

### DB Migrations (draft names)
1. `20260329_create_review_reputation_metrics.sql`
2. `20260329_create_review_reminder_jobs.sql`
3. `20260329_add_anti_brigading_counters.sql`

### Backend/API
- Distributed rate-limit adapter (Redis-backed).
- Similarity and clustering signals persisted per review.
- Notification triggers for review lifecycle and reminders.

### Frontend
- Post-submit next-actions screen.
- Contributor profile block (helpful votes, impact).
- Follow-based review alerts preferences.

### Acceptance Criteria
- Annual reminder automation runs with opt-out support.
- Suspicious velocity and similarity flags route reviews to high-risk queue.
- Review -> salary and salary -> review nudges are live.

## 4) Target Data Model (Review-Specific)

## 4.1 Table: `public.reviews` (v2 additions)

Required additions:
- `employment_status text check (employment_status in ('current','former','candidate'))`
- `role_id uuid null`
- `department_id uuid null`
- `city_id uuid null`
- `tenure_band text check (tenure_band in ('lt_6m','6_12m','1_2y','3_5y','gt_5y'))`
- `contract_type text check (contract_type in ('cdi','cdd','intern','freelance','other'))`
- `work_mode text check (work_mode in ('onsite','hybrid','remote'))`
- `pros text`
- `cons text`
- `advice_to_management text`
- `would_recommend boolean null`
- `ceo_approval boolean null`
- `experience_start_month date null`
- `experience_end_month date null`
- `moderation_reason_code text null`
- `risk_score numeric(5,2) default 0`
- `risk_flags jsonb not null default '{}'::jsonb`
- `current_version int not null default 1`
- `published_at timestamptz null`

Status expansion:
- Replace status check with:
  - `draft`
  - `submitted`
  - `pending`
  - `approved`
  - `published`
  - `rejected`
  - `hidden`
  - `under_investigation`
  - `edited_requires_review`
  - `appealed`
  - `restored`
  - `deleted`

## 4.2 Table: `public.review_versions`
- `id bigserial pk`
- `review_id bigint fk reviews`
- `version_number int not null`
- `snapshot jsonb not null`
- `change_reason text null`
- `created_by uuid null`
- `created_at timestamptz default now()`
- unique `(review_id, version_number)`

## 4.3 Table: `public.review_moderation_events`
- `id bigserial pk`
- `review_id bigint fk reviews`
- `from_status text not null`
- `to_status text not null`
- `reason_code text not null`
- `note text null`
- `actor_user_id uuid null`
- `actor_role text not null`
- `risk_snapshot jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`

## 4.4 Table: `public.review_appeals`
- `id uuid pk default gen_random_uuid()`
- `review_id bigint fk reviews`
- `appellant_user_id uuid not null`
- `appeal_type text check (appeal_type in ('author','company_owner'))`
- `message text not null`
- `status text check (status in ('open','in_review','accepted','rejected')) default 'open'`
- `resolved_by uuid null`
- `resolved_at timestamptz null`
- `resolution_note text null`

## 4.5 Report Reason Taxonomy (replace old enum)
- `spam_or_promotional`
- `fake_or_coordinated`
- `personal_data_or_doxxing`
- `harassment_or_hate`
- `defamation_unverified_accusation`
- `conflict_of_interest`
- `off_topic`
- `copyright_or_copied_content`
- `other`

## 5) API Contracts (Next.js + DB API)

## 5.1 Create Review
`POST /api/reviews`

Request body:
```json
{
  "businessId": "text",
  "employmentStatus": "current",
  "roleId": "uuid",
  "cityId": "uuid",
  "tenureBand": "1_2y",
  "contractType": "cdi",
  "workMode": "hybrid",
  "overallRating": 4,
  "dimensionRatings": {
    "workLifeBalance": 4,
    "management": 3,
    "careerGrowth": 4,
    "culture": 4
  },
  "title": "Bonne progression mais management variable",
  "pros": "...",
  "cons": "...",
  "adviceToManagement": "...",
  "wouldRecommend": true,
  "ceoApproval": null,
  "isAnonymous": true
}
```

Response:
```json
{
  "id": 123,
  "status": "pending",
  "moderationSla": "2026-03-02T12:00:00Z"
}
```

## 5.2 Update Review
`PATCH /api/reviews/{id}`
- Creates `review_versions` snapshot.
- Sets status to `edited_requires_review`.

## 5.3 Transition Review (moderation only)
`POST /api/reviews/{id}/transition`

Request:
```json
{
  "toStatus": "published",
  "reasonCode": "policy_pass_after_manual_review",
  "note": "optional"
}
```

Rules:
- Requires admin/moderator permission.
- Always writes `review_moderation_events`.

## 5.4 Report Review
`POST /api/review-reports`

Request:
```json
{
  "reviewId": 123,
  "businessId": "text",
  "reason": "personal_data_or_doxxing",
  "details": "optional"
}
```

## 5.5 Appeals
- `POST /api/reviews/{id}/appeals`
- `GET /api/moderation/review-appeals`
- `POST /api/moderation/review-appeals/{id}/resolve`

## 6) Screen-Level Acceptance Criteria

## A) Discover (home -> listing -> company)
- Review count and rating shown with confidence context.
- If review count < threshold, show low-signal warning (not just score).
- CTA `Donner mon avis` appears in hero and action bar.

## B) Read
- Review cards show context chips.
- Filters are functional on desktop and mobile.
- Sorting supports newest, most helpful (Wilson), highest rating.
- Empty states include next actions.

## C) Write
- Wizard supports save draft.
- Privacy step is mandatory before submit.
- Validation catches PII and risky phrasing patterns.

## D) Post-submission lifecycle
- Author can edit/delete own review.
- Edit creates version and remoderation.
- Report + helpful voting visible on each card.

## E) Moderation and appeals
- Queues by risk type.
- SLA countdown visible in admin queue.
- Rejection requires reason code.

## F) Company-side interactions
- Owner can post one policy-compliant reply.
- Owner can submit dispute/appeal request.
- Owner cannot modify review content fields.

## 7) Trust and Safety Rules (Enforced)

1. One active review per user per company per 12 months.
2. Max 3 review submissions/day/user.
3. Max 2 reviews/day/user for same city+sector when account age < 7 days.
4. Similarity threshold routes to high-risk queue.
5. Device/IP clusters elevate risk score.
6. Extreme rating burst detection routes to investigation queue.
7. PII patterns block submit until edited.
8. Defamation-risk patterns force pending + manual review.
9. Owner replies go through policy scan before publish.
10. Every moderation decision must have reason code and audit event.

## 8) KPI and Instrumentation

Primary:
- Published reviews/week
- Rejection rate by reason
- Median moderation SLA
- % reviews with complete context fields
- Repeat reviewer rate (second submission in 90 days)

Secondary:
- Helpful vote participation rate
- Report-to-action time
- Owner reply quality pass rate
- Appeal overturn rate

Events to add:
- `review_wizard_step_completed`
- `review_privacy_warning_triggered`
- `review_submitted`
- `review_published`
- `review_rejected`
- `review_reported`
- `review_appeal_submitted`
- `review_owner_reply_submitted`

## 9) Feature Flags and Rollout

Flags:
- `reviews_v2_schema_enabled`
- `reviews_wizard_enabled`
- `reviews_trust_chips_enabled`
- `reviews_moderation_v2_enabled`
- `reviews_appeals_enabled`

Rollout:
1. Internal admin-only validation (1-2 days).
2. 10% beta cohort.
3. 50% cohort after KPI stability.
4. 100% rollout + remove legacy path.

## 10) QA and Test Matrix

Required test suites:
- Unit: validation rules, state transitions, reason code enforcement.
- Integration: create/update/report/appeal lifecycle.
- E2E: read, write wizard, owner reply, moderator queue.
- Abuse tests: burst submissions, duplicate content, PII injection.
- Accessibility: keyboard nav, focus states, contrast, tap targets.

Exit criteria:
- No high-severity trust/safety regressions.
- 95% transition-path test pass.
- SLA monitors and audit logs verified in staging.

---

## Appendix A: Example Migration Snippet (status check)

```sql
alter table public.reviews
  drop constraint if exists reviews_status_check;

alter table public.reviews
  add constraint reviews_status_check
  check (status in (
    'draft',
    'submitted',
    'pending',
    'approved',
    'published',
    'rejected',
    'hidden',
    'under_investigation',
    'edited_requires_review',
    'appealed',
    'restored',
    'deleted'
  ));
```

## Appendix B: Suggested Moderation Reason Codes

- `policy_pass_after_manual_review`
- `pii_exposure`
- `harassment_or_hate`
- `defamation_risk`
- `coordinated_abuse_suspected`
- `off_topic_low_value`
- `copyright_violation`
- `appeal_accepted_restore`
- `appeal_rejected`


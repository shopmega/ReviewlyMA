# Referral Module Migration Spec

Date: 2026-03-13
Scope: move from the current referral marketplace (`offers + public demands`) to a community help module centered on `Advice`, `CV Review`, and `Referral Request`

## 1. Product Decision

The current referral product is not the same as the target module.

Current model:

- employee publishes referral offers
- candidate publishes public demand listings
- users meet through marketplace cards and offer-linked messaging

Target model:

- candidate creates a help request
- request type is one of `advice`, `cv_review`, `referral`
- employees/helpers declare what help they offer
- company page, global feed, dashboards, and private threads all revolve around requests

Decision:

- treat the Reviewly-style request module as the new primary referral product
- preserve selected strengths from the current system:
  - company-page referral tab
  - global feed
  - anti-payment and anti-spam controls
  - verification badges
  - private messaging
- retire the current `offer-first` mental model from public UX

## 2. Current vs Target

### Current AVis module

- primary entities are `job_referral_offers`, `job_referral_demand_listings`, `job_referral_requests`, `job_referral_messages`
- company page shows `offers` and `public demand mentions`
- global feed mixes offers and demands
- inbox is split into:
  - requests received on my offers
  - responses received on my public demands
- status model is referral-pipeline-heavy:
  - `pending`
  - `in_review`
  - `referred`
  - `interview`
  - `hired`
  - `rejected`
  - `withdrawn`

### Target request module

- primary entity is a single `referral_request`
- request type is first-class:
  - `advice`
  - `cv_review`
  - `referral`
- helper capability is first-class:
  - can offer advice
  - can review CV
  - can refer
- response flow starts with quick actions, then moves into a private thread
- outcome model is cross-type:
  - `advice_provided`
  - `cv_reviewed`
  - `referral_submitted`
  - `not_a_fit`
  - `no_response`

## 3. Required UX Changes

### A. Company page tab

Replace the current referrals tab content.

Current:

- active offers
- public demand mentions

Target:

- open requests for this company
- helpers at this company
- recently answered requests

Implication:

- `offers` should not be the lead content block anymore
- the company page becomes the highest-intent place to request help for that employer

### B. Global referrals feed

Replace `offers/demands` segmentation with `request type` segmentation.

Target card examples:

- `Data Analyst - Capgemini Casablanca` + `Advice`
- `Product Manager - Glovo Remote` + `Referral`
- `Backend Engineer - Oracle Morocco` + `CV Review`

Target filters:

- company
- city
- job type / contract / work mode
- request type
- request status

Optional secondary filters:

- verified helpers available
- current employee / former employee

### C. Create request flow

Replace the current public demand form with one request form.

Required fields:

- company
- job title
- department
- location
- job post link
- request type
- short pitch
- current role
- experience level
- why interested
- relevant skills
- LinkedIn URL
- portfolio / GitHub URL
- CV upload or CV URL
- privacy mode:
  - `public`
  - `anonymous_preview`

Notes:

- `department`, `job post link`, and `privacy mode` do not exist in the current demand flow
- CV should become a supported attachment, not just a link pasted into one specific request path

### D. Helper profile

Add a dedicated helper settings surface.

Required controls:

- open to advice
- open to CV review
- open to referrals
- company
- role
- department
- city
- current employee / former employee
- verified employee badge state
- availability toggle

This is a new product surface. The current system has trust on offers, not helper profiles.

### E. Response flow

Current response entry points are free-text and channel-specific.

Target response entry points should include quick actions:

- `I can help with advice`
- `Send me your CV`
- `I can review your profile`
- `I may refer you`
- `Sorry, I cannot help`

Implementation note:

- quick actions should create structured response events before the private thread begins
- free text remains available after the action is chosen

### F. Private conversation

Unify messaging around request threads, not offer threads.

Conversation should support:

- messages
- attachment exchange
- request status timeline
- request outcome selection

Suggested timeline events:

- request posted
- helper responded
- CV shared
- referral submitted
- closed

### G. Dashboards

Replace marketplace-oriented dashboards with role-oriented dashboards.

Candidate dashboard:

- my requests
- open
- responded
- closed

Helper dashboard:

- incoming requests
- advice
- CV review
- referral

Important:

- `Mes offres` and `Mes demandes publiques` should become legacy routes and eventually redirect into the new dashboard model

## 4. Data Model Migration

### Target tables

#### `referral_requests`

- `id`
- `user_id`
- `company_id`
- `job_title`
- `department`
- `location`
- `job_post_url`
- `request_type`
- `pitch`
- `experience_level`
- `current_role`
- `why_interested`
- `relevant_skills`
- `cv_url`
- `linkedin_url`
- `portfolio_url`
- `privacy_mode`
- `status`
- `created_at`
- `updated_at`

#### `helper_profiles`

- `id`
- `user_id`
- `company_id`
- `company_name_snapshot`
- `role`
- `department`
- `city`
- `employment_status`
- `can_offer_advice`
- `can_review_cv`
- `can_refer`
- `availability_status`
- `verified`
- `verified_at`
- `created_at`
- `updated_at`

#### `referral_request_responses`

- `id`
- `request_id`
- `helper_user_id`
- `quick_action`
- `message`
- `status`
- `created_at`
- `updated_at`

#### `referral_conversations`

- `id`
- `request_id`
- `helper_user_id`
- `candidate_user_id`
- `status`
- `last_message_at`
- `created_at`
- `updated_at`

#### `referral_messages`

- `id`
- `conversation_id`
- `sender_user_id`
- `message`
- `attachment_url`
- `attachment_type`
- `created_at`

#### `referral_outcomes`

- `id`
- `request_id`
- `helper_user_id`
- `result`
- `closed_at`
- `closed_by`

### Migration strategy

Do not mutate the current marketplace tables in place first.

Recommended approach:

1. add new request-module tables beside the current tables
2. ship new UI against the new tables behind a feature flag
3. preserve old routes as legacy read-only views during cutover
4. migrate only data that maps cleanly
5. archive or deprecate old marketplace-specific tables later

### Data mapping

Safe partial mappings:

- `job_referral_demand_listings` -> `referral_requests`
  - map as `request_type = referral` by default only when semantics are truly referral-seeking
- `job_referral_demand_responses` -> `referral_request_responses`
- `job_referral_messages` should not be blindly migrated unless the source request/thread relationship is preserved

Do not auto-map these as-is:

- `job_referral_offers`
  - these represent supply inventory, not helper profiles
- `job_referral_requests`
  - these are offer applications, not generic help requests

Instead:

- use `job_referral_offers` only as source material to seed optional `helper_profiles` for verified owners if product approves that shortcut

## 5. Route Plan

### Keep

- `/businesses/[slug]?tab=referrals`
- `/parrainages`
- `/parrainages/inbox`

### Rework

- `/parrainages`
  - becomes request feed, not offers-demand marketplace
- `/parrainages/new`
  - becomes unified request creation route
- `/parrainages/inbox`
  - becomes helper/candidate unified request inbox

### Add

- `/parrainages/request/[id]`
- `/parrainages/conversations/[id]`
- `/parrainages/helpers`
- `/parrainages/helpers/settings`
- `/dashboard/requests`
- `/dashboard/helper-requests`

### Deprecate

- `/parrainages/[id]` as public offer-detail primary path
- `/parrainages/mes-offres`
- `/parrainages/mes-demandes`
- `/parrainages/mes-demandes-publiques`

Deprecation method:

- phase 1: label as legacy
- phase 2: soft redirect from navigation
- phase 3: hard redirect once migration is complete

## 6. API / Action Layer Changes

### Replace current action emphasis

Current action emphasis:

- create referral offer
- create public demand
- request referral from offer
- respond to public demand
- send message inside offer request thread

Target action emphasis:

- create request
- update request
- close request
- create helper profile
- update helper profile
- respond to request with quick action
- open conversation
- send conversation message
- set request outcome
- report request / helper / message

### New enums

#### `request_type`

- `advice`
- `cv_review`
- `referral`

#### `privacy_mode`

- `public`
- `anonymous_preview`

#### `quick_action`

- `help_advice`
- `send_cv`
- `review_profile`
- `may_refer`
- `cannot_help`

#### `request_status`

- `open`
- `responded`
- `in_conversation`
- `closed`

#### `outcome_result`

- `advice_provided`
- `cv_reviewed`
- `referral_submitted`
- `not_a_fit`
- `no_response`

## 7. Trust, Safety, and Moderation

Keep these current strengths:

- ban on payment language
- ban on forced off-platform messaging
- reporting
- blocking
- rate limits

Extend moderation targets beyond offer-only reporting.

New report targets:

- request
- helper profile
- response
- conversation message

Employee trust signals to keep:

- verified employee badge
- role
- company
- number of requests answered

Candidate trust signals to add:

- profile completeness
- CV attached
- previous participation

Avoid:

- opaque ranking scores as a primary UX concept
- premium boosts
- AI-generated outreach

## 8. Anti-Spam Rules

Target rules from day one:

- max 3 active requests per candidate
- max 5 direct asks per week
- duplicate-content detection across requests
- no empty pitch
- no mass copy-paste to helpers
- helper can disable request types individually
- helper can block users

Implementation note:

- current rate limiting can be reused, but quotas must move from `offer publication` logic to `request creation` and `helper response` logic

## 9. Frontend Delivery Plan

### Phase 1: data foundation

- add new schema
- add RLS and moderation policies
- add typed server helpers
- keep old UI intact

### Phase 2: helper profiles + request creation

- ship helper settings
- ship unified request creation
- ship request detail page

### Phase 3: company tab + global feed

- replace company referrals tab with request-centric layout
- convert `/parrainages` into request feed

### Phase 4: conversation + dashboards

- unify inbox and thread model
- launch candidate dashboard and helper inbox

### Phase 5: deprecate legacy marketplace

- remove `publish offer` from primary navigation
- downgrade old offer pages to legacy or redirect
- archive old data model if migration succeeds

## 10. Minimal First Release

Do not try to ship the full target module in one pass.

Smallest credible V1:

1. unified request type model
2. request creation form
3. company-page request list
4. request detail page
5. helper profile settings
6. quick response actions
7. private conversation thread
8. candidate + helper dashboards

Can wait for V1.1:

- anonymous preview mode
- attachments beyond CV and LinkedIn
- recently answered request feed
- former employee filtering
- advanced moderation tooling

## 11. Product Risks

### Risk 1: dual-system confusion

If old offers stay visible beside new requests too long, users will not understand the product model.

Mitigation:

- feature-flag the new module
- remove old publish CTAs as soon as the new request flow is live

### Risk 2: over-migrating incompatible data

Current offer/application records do not map cleanly to the new request system.

Mitigation:

- migrate selectively
- keep legacy data read-only rather than forcing lossy translation

### Risk 3: helper cold-start

The target module needs helper profiles to feel alive.

Mitigation:

- prompt verified users from existing referral offers to create helper profiles on first visit
- seed helper counts on company pages only after profile creation, not via silent inference

## 12. Recommended Engineering Order

1. define canonical product language:
   `Advice`, `CV Review`, `Referral Request`, `Helper`
2. add schema for requests, helper profiles, responses, conversations, outcomes
3. implement centralized entitlement and moderation checks for the new entities
4. build unified request creation flow
5. build helper settings
6. replace company referral tab
7. replace global feed
8. replace inbox with conversation-centric dashboard
9. deprecate legacy offer-first routes

## Bottom Line

The current AVis referral system already has useful building blocks, but it is not the same product as the target Reviewly-style module.

The migration should not be framed as a visual redesign. It is a product-model migration:

- from `marketplace inventory`
- to `community help requests`

If the product decision is approved, the next practical step is to write:

- SQL schema migrations
- TypeScript types
- server actions
- route-by-route UI specs

for the new request module without extending the old marketplace model further.

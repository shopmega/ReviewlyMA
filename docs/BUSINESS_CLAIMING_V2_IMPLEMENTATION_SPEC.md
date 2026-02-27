# Business Claiming V2 Implementation Spec (Reviewly MA)

## Goal
Increase verified company participation without weakening neutrality, reviewer safety, or legal defensibility.

## Current System Findings (Code-Mapped)
- Claim lifecycle is effectively `pending/approved/rejected` in logic and UI.
  - `src/app/actions/claim.ts`
  - `src/app/actions/claim-admin.ts`
  - `src/app/(admin)/admin/revendications/page.tsx`
- Verification is method-driven but not risk-scored; no explicit impersonation risk tiering.
  - `proof_methods`, `proof_status`, `verification_codes`
- Company-side role model is too coarse for trust controls:
  - `profiles.role` (`user|pro|admin`) and `user_businesses.role` (`owner|manager|employee`)
  - No policy-grade distinction between HR, comms, analyst access.
- Public neutrality signaling is weak:
  - Claimed surfaces exist, but no structured public verification metadata (last-verified, scope, suspension reason class).

## Product Principle (Lock This In)
Claiming grants a verified communication channel, not moderation power.

Non-negotiables:
- Company cannot delete or hide user reviews.
- Subscription tier cannot influence moderation outcomes.
- Verification badge is identity/authority proof only, never endorsement.

## Target Claim Lifecycle
Keep legacy `business_claims.status` for backward compatibility. Add new canonical state machine:

- `unclaimed`
- `claim_requested`
- `verification_pending`
- `verification_failed`
- `verified`
- `suspended`
- `revoked`

Mapping for compatibility:
- `pending` => `verification_pending`
- `approved` => `verified`
- `rejected` => `verification_failed`

## DB Changes (Migration Scope)
Create new migration (suggested name):
- `supabase/migrations/20260301103000_business_claiming_v2_state_and_risk.sql`

### 1) Claim State + Risk Columns
Add to `public.business_claims`:
- `claim_state text` with check constraint above
- `risk_score int default 0 check (risk_score between 0 and 100)`
- `risk_level text default 'low' check (risk_level in ('low','medium','high','critical'))`
- `verification_due_at timestamptz`
- `last_verified_at timestamptz`
- `next_reverification_at timestamptz`
- `suspension_reason_code text`
- `revoked_at timestamptz`
- `revoked_by uuid references public.profiles(id) on delete set null`
- `revoke_reason text`

Indexes:
- `(business_id, claim_state)`
- `(claim_state, created_at desc)`
- `(risk_level, created_at desc)`
- partial index on `claim_state in ('verification_pending','suspended')`

### 2) Claim Event Log (Immutable History)
Create `public.business_claim_events`:
- `id uuid pk`
- `claim_id uuid not null`
- `from_state text`
- `to_state text not null`
- `reason_code text`
- `note text`
- `actor_user_id uuid`
- `actor_role text` (`system|admin|claimant`)
- `event_meta jsonb default '{}'::jsonb`
- `created_at timestamptz`

Purpose:
- defensible moderation trail
- incident forensics
- public transparency summary source

### 3) Verification Evidence Ledger
Create `public.claim_verification_evidence`:
- `id uuid pk`
- `claim_id uuid not null`
- `method text` (`email_domain|document|linkedin|phone|admin_manual`)
- `status text` (`pending|verified|failed|expired`)
- `confidence_score int check 0..100`
- `evidence_ref text` (storage path / hash reference)
- `reviewed_by uuid null`
- `reviewed_at timestamptz`
- `expires_at timestamptz`
- `meta jsonb`
- `created_at timestamptz`

### 4) Business Team RBAC Upgrade
Upgrade `public.user_businesses.role` to include:
- `owner`
- `hr_manager`
- `communications_officer`
- `analyst`

Add:
- `assignment_status text default 'active' check (assignment_status in ('active','suspended','revoked'))`
- `verified_at timestamptz`
- `verification_expires_at timestamptz`
- `granted_by uuid references public.profiles(id) on delete set null`

### 5) Public Verification Metadata
Add to `public.businesses`:
- `verification_badge_level text default 'none' check (verification_badge_level in ('none','verified_identity','verified_active_responder'))`
- `verification_last_checked_at timestamptz`
- `verification_public_note text` (short neutral statement)

## RPC/Function Layer
Add server-side RPCs (security definer + strict auth checks):

1. `public.compute_claim_risk_score(p_claim_id uuid)` -> table(score int, level text, factors jsonb)
- factors include domain mismatch, free email, authority mismatch, prior failed attempts, IP anomaly signal.

2. `public.transition_claim_state(p_claim_id uuid, p_to_state text, p_reason_code text default null, p_note text default null)`
- enforces allowed transitions only
- inserts into `business_claim_events`
- updates legacy `status` mapping fields for compatibility

3. `public.can_manage_business_action(p_business_id text, p_action text, p_uid uuid default auth.uid()) returns boolean`
- central authorization for company panel actions
- reads `user_businesses.role`, `assignment_status`, claim verification freshness

## API / Action Refactor Plan

### A) `submitClaim` split by flow step
Current:
- `submitClaim` does creation + proof + side effects in one path.

Target:
- `createClaimDraft`
- `submitClaimVerification`
- `finalizeClaimSubmission`

Keep `submitClaim` as compatibility wrapper during beta.

### B) Approval action
Current:
- `updateClaimStatus(id, approved|rejected, reason?)`

Target:
- `reviewClaim(claimId, decision, reasonCode, notes)`
- if approved: transition to `verified` via RPC
- if rejected: transition to `verification_failed`
- if security alert: transition to `suspended` or `revoked`

### C) Route guards
Update route access checks from `claim.status==='approved'` to:
- `claim_state='verified'`
- and `assignment_status='active'`

Files to update:
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/components/layout/Header.tsx`
- `src/hooks/useBusinessProfile.ts`

## UX Redesign (Concrete)

### Claim Entry (`/claim` + CTA surfaces)
Add pre-claim card before wizard start:
- "What you can do"
- "What you cannot do"
- expected SLA
- accepted verification methods
- data handling note for uploaded documents

File touchpoints:
- `src/app/claim/page.tsx`
- `src/components/business/BusinessSidebar.tsx`
- `src/components/business/BusinessInsightsTabs.tsx`

### New Wizard (`/claim/new`)
Steps:
1. Eligibility (company match + claimant role)
2. Account/Auth checkpoint (if not logged in)
3. Work email OTP
4. Authority proof upload (required for high-risk claimant types)
5. Optional LinkedIn corroboration
6. Declarations + submit

Required fields:
- full_name, job_title, claimer_type, work_email, business_id
- at least one authority proof when role is `agency_representative` or `employee_delegate`

Optional:
- linkedin_url
- manager_contact_email
- additional context note

Autofill:
- suggest business from email domain
- prefill company city/category from existing business record

### Admin Moderation (`/admin/revendications`)
Replace single queue with tabs:
- `High risk`
- `Pending`
- `Failed/Needs resubmission`
- `Suspended/Revoked`

Per claim show:
- risk score + factor chips
- verification method matrix
- claim event timeline
- quick actions tied to state machine only

## Safety Controls
- Mandatory MFA before:
  - role escalation to owner
  - exporting analytics
  - changing response policies
- Response abuse reporting on all company replies.
- Response moderation lint (threat/intimidation keyword policy).
- Rate limits:
  - claim attempts per account/IP
  - verification code resends per method/day

## Neutrality Safeguards (Public + Internal)
- Public disclaimer near badge:
  - "Verified confirms representative identity. It does not alter review moderation."
- Pricing page and company dashboard both state:
  - paid plans do not influence moderation outcomes.
- Internal guardrail:
  - no monetization feature can call moderation status update paths.

## Rollout Plan

Phase 0 (1-2 days):
- Add new columns/tables with no behavior changes.
- Backfill `claim_state` from legacy `status`.

Phase 1 (2-4 days):
- Start writing claim events and risk score on submission.
- Keep UI unchanged.

Phase 2 (3-5 days):
- Launch new `/claim/new` step order and pre-claim transparency block.
- Admin queue shows risk + evidence matrix.

Phase 3 (2-3 days):
- Enforce `can_manage_business_action` for sensitive company actions.
- Introduce upgraded `user_businesses` role set.

Phase 4 (2-3 days):
- Public badge metadata + neutrality disclosures.
- Re-verification scheduler (owner annual, delegated semi-annual).

## KPIs (Track Weekly)
- Claim start -> submit conversion
- Submit -> verified conversion
- Median time to verification
- False approval rate (post-approval revocations)
- Reviewer complaints about company intimidation
- Claimed-company response quality score (moderation pass rate)

## Immediate Code Tasks (First PR)
1. Add migration for claim v2 state/risk/events/evidence.
2. Add `transition_claim_state` and `compute_claim_risk_score` RPC stubs.
3. Update `claim-admin.ts` to use state transitions while preserving legacy status writes.
4. Add pre-claim transparency section in `src/app/claim/page.tsx`.
5. Add "verification scope" tooltip in business public profile badge component.

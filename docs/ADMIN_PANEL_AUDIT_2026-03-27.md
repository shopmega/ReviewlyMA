# Admin Panel Audit

Date: 2026-03-27
Scope: Current implementation audit of admin panel coverage, settings wiring, moderation tooling, operational fit, and admin-to-app propagation.
Repository: `AVis-prod`

Status note:
- The job referrals module is being decommissioned.
- Findings related to referral offers, referral demand listings, referral reports, and related moderation/admin gaps should be interpreted as shutdown and migration risks, not as a recommendation to expand that module further.
- Priority for this area should shift from feature-completion to safe sunset: disabling entrypoints, removing dead admin surfaces, preserving auditability, and cleaning up data exposure.

## 1. Executive Summary

Overall verdict: the admin panel is broad, but it is not yet a dependable source of truth for the product.

The implementation covers many core surfaces:
- reviews
- salaries
- claims
- support
- business suggestions
- homepage/blog curation
- referral offers
- payment verification

But it does not yet fully match the operational needs of the main app.

Highest-risk findings:
- Referral demand listings exist in the public product with no admin ownership, which is a sunset risk while the module is still live.
- Job-offer analysis has public-facing moderation states that the admin panel cannot actually manage.
- Several admin settings are cosmetic or only partially wired.
- Some admin dashboards are misleading because they count the wrong data source or expose cosmetic filters.
- Permission separation is too coarse for sensitive admin data.

Confidence level: medium-high for code wiring analysis, medium for runtime behavior because the audit was code-first and not a full live end-to-end verification.

## 2. Feature Parity Matrix

| Main app feature | Existing admin coverage | Coverage level | Notes | Risk |
|---|---|---|---|---|
| Business discovery and listings | `/admin/etablissements`, `/admin/homepage`, `/admin/business-suggestions` | Partial | Business create/feature/delete exists, but deep correction workflows are limited | High |
| Reviews | `/admin/avis`, `/admin/avis-signalements`, `/admin/avis-appels` | Partial | Moderation exists, but internal case management is thin | Medium |
| Salaries | `/admin/salaires`, `/admin/statistiques` | Partial | Moderation exists, but global feature disable is incomplete | High |
| Claims and ownership verification | `/admin/revendications` | Partial | Core approval exists, but proof-method config is only partially enforced | High |
| Referral offers and requests | `/admin/parrainages` | Partial | Module is being decommissioned; admin route now acts as a retirement notice rather than an active operations console | Medium |
| Referral demand listings and responses | None | Partial shutdown | New actions are blocked and major discoverability is reduced, but legacy referral-era routes and content still need final archival treatment | High |
| Job-offer analysis | `/admin/job-offers` | Partial | Mapping queue plus approval/reject/publication controls now exist, but richer workflow metadata is still limited | Medium |
| Premium payments and subscriptions | `/admin/paiements`, `/admin/parametres` | Partial | Manual verification works, gateway controls are partly cosmetic | High |
| Support tickets | `/admin/support` | Partial | Assignment, escalation, internal notes, and SLA are now first-class controls; still lacks deeper automation and case analytics | Medium |
| Business-user messaging | `/admin/messages` | Partial | Admin now has a visibility queue over direct messages, but not a full moderation workflow | Medium |
| Homepage curation | `/admin/homepage` | Good | Featured businesses and seasonal collections are real controls | Low |
| Blog CMS | `/admin/blog` | Good | Create/edit/publish flows appear directly useful | Low |
| Global site settings | `/admin/parametres` | Partial | Multiple toggles are dead or partially propagated | Critical |

## 3. Settings And Controls Wiring Audit

| Setting/control | Admin location | Intended effect | Actual wiring status | Evidence/signals | Problem | Recommended fix | Priority |
|---|---|---|---|---|---|---|---|
| `maintenance_mode` | `/admin/parametres` | Put site into maintenance | Fully wired | Read in middleware | Good | Keep | P1 |
| `enable_reviews` | `/admin/parametres` | Disable reviews | Fully wired | Enforced in route/page and `submitReview` | Closed | Keep regression coverage | Done |
| `enable_salaries` | `/admin/parametres` | Disable salary features | Fully wired | Enforced in salary page and `submitSalary` | Closed | Keep regression coverage | Done |
| `enable_claims` | `/admin/parametres` | Disable claims | Fully wired | Enforced in claim entrypoints and `submitClaim` | Closed | Keep regression coverage | Done |
| `verification_methods` | `/admin/revendications` | Limit allowed claim proof methods | Fully wired | Typed in site settings, consumed by claim UIs, and validated server-side in `submitClaim` | Closed | Keep typed/defaulted and regression-tested | Done |
| `payment_methods_enabled` | `/admin/parametres` | Control payment methods shown to users | Partially wired | Bank/chari are actionable; PayPal/Stripe are placeholders only | Mixed real/cosmetic state | Hide unimplemented methods or build provider flows | P1 |
| `premium_enabled` | `/admin/parametres` | Enable or disable premium product | Removed from active admin/runtime contract | UI removed; stale writes rejected | Legacy DB residue may remain | Keep rejecting stale payloads | Done |
| `require_email_verification` | `/admin/parametres` | Force email verification | Removed from active app-facing settings contract | Runtime no longer exposes it as live config; stale writes rejected | Legacy DB residue may remain | Reintroduce only with real auth enforcement | Done |
| `default_language` | `/admin/parametres` | Default locale behavior | Removed from active app-facing settings contract | Runtime no longer advertises it as live config; stale writes rejected | Legacy DB residue may remain | Reintroduce only with real locale enforcement | Done |
| `enable_interviews` | `/admin/parametres` | Enable interview module | Removed from active app-facing settings contract | Runtime no longer advertises it as live config; stale writes rejected | Legacy DB residue may remain | Reintroduce only with real module gating | Done |
| `enable_messaging` | `/admin/parametres` | Enable messaging | Removed from active app-facing settings contract | Runtime no longer advertises it as live config; stale writes rejected | Legacy DB residue may remain | Reintroduce only with real gating | Done |
| `tier_gold_*` pricing | `/admin/parametres` | Control paid plan pricing | Fully wired | `tier_gold_*` is now the canonical admin write path; legacy `tier_pro_*` remains read-only fallback in normalization | Legacy DB alias columns may still exist | Remove legacy schema after data migration | P1 |
| `google_analytics_id` / `facebook_pixel_id` | `/admin/parametres` | Control analytics tags | Partially wired | Layout passes DB values, component still falls back to env vars | Admin may think tracking is off while env keeps it on | Show override state or make DB authoritative | P1 |
| Analytics time-range selector | `/admin/analytics` | Change reporting window | UI only / not connected | UI updates local state, action ignores time range | Misleading dashboard | Pass range into analytics query layer | P2 |

## 4. Missing Admin Capabilities

- No moderation or control surface for referral demand listings if any legacy referral-era routes remain intentionally reachable during archival.
- No moderation or control surface for referral demand responses if any legacy referral-era routes remain intentionally reachable during archival.
- No richer job-offer review workflow for reviewer notes, assignment, or decision history beyond core approve/reject/publish controls.
- Messaging now has an admin visibility surface, but still lacks moderation actions such as takedown, restriction, or case notes.
- No strong correction workflow for core business data beyond basic CRUD.
- Support now has assignment, internal notes, escalation, and SLA ownership fields, but still lacks richer automation and team-performance reporting.
- No unified operator workflow for incident handling across reviews, reports, claims, messaging, and referrals.

Referral-module decommissioning additions:
- No explicit admin kill switch or staged shutdown workflow for referral surfaces.
- `/admin/parrainages` is now a retirement notice, but several legacy public referral-era routes and content surfaces still need final removal or archival decisions.
- No documented archival or removal plan for referral demand data, reports, and messages.

## 5. Dead, Suspicious, Or Partial Controls

- Legacy DB rows may still contain retired keys such as `premium_enabled`, `require_email_verification`, `default_language`, `enable_interviews`, and `enable_messaging`, but the active runtime contract now ignores them.
- `/admin/analytics` exposes a time-range selector that does not alter the query.
- `/admin/moderation` counts `reported_content` while media moderation actually runs on `media_reports`.
- `/admin/moderation` counts referral offers in `pending` state, but referral offers are created as `active`.
- `/admin/paiements` implies live gateway sync while the current flow is manual/offline.
- `/admin/parrainages` is now correctly labeled as a retirement surface, but some public content still references referral-era flows.

## 6. Role And Permission Gaps

- The top-level admin layout enforces `admin.panel.access`, but most pages do not enforce narrower read permissions.
- The RBAC model exists, but practical enforcement is incomplete.
- Sensitive claim proof access checks only for generic admin role, not a narrower permission scope.
- Several admin screens mutate data directly from the client instead of using permission-aware server actions.
- This creates weak separation between super admin, ops, moderator, analyst, and support roles.

## 7. Operations And Moderation Gaps

- The admin panel is still closer to a moderation dashboard than a true operations console.
- Referral abuse handling is asymmetric: offer-side moderation exists, demand-side moderation does not. Since the module is being decommissioned, this should be resolved by shutdown or hidden exposure, not by expanding tooling.
- Support handling now has operator ownership mechanics, but not escalation automation or queue analytics.
- Business reports, media reports, review reports, review appeals, and audit logs are now served through permission-checked server paths rather than direct browser queries.
- Messaging can be used by premium businesses, and admin now has a visibility queue, but misuse/compliance review still lacks moderation actions.

## 8. Root Cause Hypotheses

- Settings schema is ahead of runtime usage.
- Multiple controls were implemented at the UI layer only.
- Legacy and current configuration fields coexist, creating duplicate sources of truth.
- Some new config is stored as shadow settings outside the typed settings model.
- Some admin dashboards read old or wrong tables.
- Some admin modules depend on optional schema artifacts not guaranteed to be deployed.
- Several high-risk admin pages were previously client-heavy. Claims, settings, media reports, review reports, business reports, review appeals, and audit logs have now been moved behind server-side permission checks or server actions.

## 9. Prioritized Action Plan

### P0

- Completed: enforce `enable_reviews`, `enable_salaries`, and `enable_claims` in server actions and route entrypoints.
- Decommission the referral module safely: disable creation entrypoints, remove discoverability, and prevent new referral demand/offer activity.
- Completed: add job-offer moderation actions for approval, rejection, publication, and visibility changes.
- Fix moderation hub counts and queue sources.
- Replace generic admin-role access for claim proofs with permission-scoped authorization.
- Completed: remove `premium_enabled` from the active admin/runtime contract.

### P1

- Completed: move `verification_methods` into the typed settings model and validate server-side.
- Completed in the app-facing contract: retire the unused settings fields and reject stale writes from old clients.
- Convert client-side admin mutations into server actions with audit logging.
- Add route-level and action-level RBAC enforcement for sensitive modules.
- Align payments UI with actual implementation status.
- Keep `tier_gold_*` as the only live admin write contract, then remove legacy `tier_pro_*` columns after migration.
- Expand support operations from the new workflow fields into richer automation, team ownership reporting, and escalation rules.
- Extend `/admin/messages` from visibility into true moderation controls if messaging remains a sensitive live channel.
- Remove or clearly mark referral admin surfaces during the sunset period.
- Add a referral-data retention, archival, or deletion decision for offers, requests, reports, demand listings, demand responses, and messages.

### P2

- Make analytics filters real.
- Label estimated analytics as estimates.
- Improve operator UX with clearer impact previews and live status states.
- Audit visibility is now server-guarded at `/admin/audit`; remaining work is breadth, not basic access integrity.

## 10. Test Plan

### Global settings

1. Enable maintenance mode in admin.
2. Verify anonymous traffic is redirected to `/maintenance`.
3. Verify non-admin authenticated users are redirected to `/maintenance`.
4. Verify admins can still access the product.

### Reviews

1. Disable reviews in admin.
2. Verify review CTA disappears on business pages.
3. Open the direct review route manually.
4. Submit a review payload directly.
5. Expected: route and server action should both reject. Current code likely still allows submission.

### Salaries

1. Disable salaries in admin.
2. Verify salary sections disappear from business pages.
3. Visit `/salaires/partager`.
4. Submit a salary.
5. Expected: page and server action should reject. Current code likely still allows submission.

### Claims

1. Disable claims in admin.
2. Verify claim entrypoints disappear or redirect.
3. Submit a crafted claim POST.
4. Expected: server action should reject. Current code likely still accepts claims.

### Claim proof methods

1. Disable one proof method in `/admin/revendications`.
2. Verify the method disappears from the claim form.
3. Submit a crafted request containing the removed method.
4. Expected: server action should reject. Current code likely accepts it.

### Premium

1. Change premium prices in admin.
2. Verify `/dashboard/premium` shows updated prices.
3. Disable PayPal/Stripe or enable them.
4. Verify UI reflects real capability, not placeholder confusion.

### Referral marketplace

1. Confirm which public referral routes are still reachable.
2. Verify whether users can still create offers, requests, demand listings, or responses.
3. Verify admin can stop new activity during the decommissioning period.
4. Confirm the module is either hidden, read-only, or fully disabled according to the shutdown plan.

### Job-offer analysis

1. Submit a job offer analysis from the public flow.
2. Confirm it is created as `pending` and `private`.
3. Check whether admin can approve and publish it.
4. Verify public analytics/business surfaces only show approved/public data.

### Moderation integrity

1. Submit a media report.
2. Confirm `/admin/contenu` shows it.
3. Confirm `/admin/moderation` count also reflects it.
4. Current implementation likely miscounts because it reads a different table.

### Permissions

1. Test each admin role against `/admin/utilisateurs`, `/admin/paiements`, `/admin/revendications`, `/admin/support`, and `/api/proofs/[id]`.
2. Verify read access and write access follow intended scopes.
3. Current implementation likely overexposes several surfaces.

## 11. Evidence Highlights

- Admin layout only enforces broad admin access: `src/app/(admin)/admin/layout.tsx`
- RBAC model exists but is only partially enforced: `src/lib/admin-rbac.ts`
- Review toggle only affects CTA visibility: `src/components/shared/BusinessActions.tsx`
- Review submit path remains live: `src/app/actions/review.ts`
- Salary submit path remains live: `src/app/actions/salary.ts`
- Claim toggle is not enforced in submit flow: `src/app/actions/claim.ts`
- Claim proof methods are loaded in UI but not validated in submit flow: `src/app/claim/new/page.tsx`, `src/app/actions/claim.ts`
- Moderation hub reads `reported_content`: `src/app/(admin)/admin/moderation/page.tsx`
- Media moderation queue reads `media_reports`: `src/app/(admin)/admin/contenu/page.tsx`
- Admin analytics time range is cosmetic: `src/app/(admin)/admin/analytics/page.tsx`, `src/app/actions/analytics.ts`
- Referral demand listings exist only in public and action layers: `src/app/actions/referrals.ts`
- Job-offer public reads require approved visibility states the admin panel does not expose: `src/app/actions/job-offers.ts`, `src/lib/data/job-offers.ts`, `src/app/(admin)/admin/job-offers/page.tsx`

## 12. Decommissioning Note For Referrals

Because job referrals are being decommissioned, the correct product response is not to build deeper admin feature parity there.

The recommended path is:
- stop new referral creation
- remove public discovery and CTA entrypoints
- retire `/admin/parrainages` or relabel it as a temporary sunset console
- decide whether historical referral data stays readable, becomes admin-only, or is archived
- ensure reports, messages, and demand records are not left live without ownership
- remove referral counts from moderation and analytics surfaces once the module is disabled

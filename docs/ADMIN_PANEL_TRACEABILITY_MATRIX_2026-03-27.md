# Admin Panel Traceability Matrix

Date: 2026-03-27
Purpose: map public app capability to admin ownership, wiring state, and verification path.

Status note:
- The job referrals module is being decommissioned.
- Referral rows below should be read as sunset-control and shutdown-traceability items, not as a recommendation to add net-new referral admin functionality.

## A. Feature Traceability

| Public capability | Public implementation signal | Admin owner | Gap | Verification method |
|---|---|---|---|---|
| Create review | `src/app/actions/review.ts` | `/admin/avis` | Global review disable not enforced on submit path | Disable reviews, submit review directly, confirm rejection |
| Report review | `src/app/actions/review.ts` | `/admin/avis-signalements` | Covered, but queue handling is basic | Report review, verify queue item, resolve, confirm downstream state |
| Appeal review moderation | `src/app/actions/review.ts` | `/admin/avis-appels` | Covered, but minimal case metadata | Submit appeal, resolve, confirm review state and history |
| Share salary | `src/app/actions/salary.ts` | `/admin/salaires` | Global salary disable not enforced | Disable salaries, submit salary, confirm rejection |
| View salary intelligence | `src/app/businesses/[slug]/page.tsx`, salary routes | `/admin/statistiques` | Admin has analytics but not full feature governance | Compare runtime visibility before/after settings changes |
| Submit business claim | `src/app/actions/claim.ts` | `/admin/revendications` | Global claim disable not enforced | Disable claims, submit claim, confirm rejection |
| Select claim proof method | `src/app/claim/new/page.tsx` | `/admin/revendications` | UI follows config, submit path does not validate allowed methods | Remove method, submit crafted payload, confirm server rejection |
| Publish referral offer | `src/app/actions/referrals.ts` | `/admin/parrainages` | Module is being sunset; concern is whether new creation is still possible | Confirm create flow is disabled or intentionally read-only |
| Publish referral demand listing | `src/app/actions/referrals.ts` | None | No admin ownership during sunset | Confirm route is disabled or hidden before shutdown |
| Respond to referral demand | `src/app/actions/referrals.ts` | None | No admin ownership during sunset | Confirm response flow is disabled before shutdown |
| Report referral offer | `src/app/actions/referrals.ts` | `/admin/parrainages` | Temporary coverage only | Confirm report handling remains possible until module removal |
| Analyze job offer | `src/app/actions/job-offers.ts` | `/admin/job-offers` | Only employer mapping is manageable | Submit analysis, confirm admin cannot approve/publish it |
| View approved job-offer signals | `src/lib/data/job-offers.ts`, `src/app/actions/analytics.ts` | `/admin/job-offers` | Public-facing states lack admin controls | Confirm approved/public state cannot be set from admin |
| Create support ticket | `src/app/actions/support.ts` | `/admin/support` | Basic admin handling only | Create ticket, reply, confirm user sees update |
| Business-user messaging | `src/app/actions/messages.ts` | None | No admin oversight | Send abusive message scenario, confirm no admin queue exists |
| Feature businesses on homepage | `src/app/page.tsx`, `src/components/shared/HomeClient.tsx` | `/admin/homepage` | Covered | Feature/unfeature business, confirm homepage changes |
| Publish blog content | `src/app/blog/*` | `/admin/blog` | Covered | Publish article, confirm public visibility |

## B. Settings-To-Surface Map

| Setting | Storage | Runtime consumer | Surface affected | Status |
|---|---|---|---|---|
| `maintenance_mode` | `site_settings` | `src/lib/supabase/middleware-optimized.ts` | Entire site access | Fully wired |
| `enable_reviews` | `site_settings` | `src/components/shared/BusinessActions.tsx` | Review CTA | Partially wired |
| `enable_salaries` | `site_settings` | `src/app/businesses/[slug]/page.tsx` | Salary tab/section | Partially wired |
| `enable_claims` | `site_settings` | None found in runtime enforcement | Claim flow | UI only |
| `premium_enabled` | `site_settings` | None found | Premium product | UI only |
| `verification_methods` | `site_settings` | `src/app/claim/new/page.tsx` | Claim proof UI | Partially wired |
| `payment_methods_enabled` | `site_settings` | `src/app/dashboard/premium/page.tsx` | Payment method cards | Partially wired |
| `tier_gold_monthly_price` | `site_settings` | `src/app/dashboard/premium/page.tsx`, `src/app/pour-les-pros/page.tsx` | Pricing | Wired |
| `google_analytics_id` | `site_settings` | `src/app/layout.tsx`, `src/components/shared/AnalyticsConfig.tsx` | Tracking | Partially wired because env fallback exists |
| `facebook_pixel_id` | `site_settings` | `src/app/layout.tsx`, `src/components/shared/AnalyticsConfig.tsx` | Tracking | Partially wired because env fallback exists |
| `require_email_verification` | `site_settings` | None found | None | UI only |
| `default_language` | `site_settings` | None found | None | UI only |
| `enable_interviews` | `site_settings` | None found | None | UI only |
| `enable_messaging` | `site_settings` | None found | None | UI only |

## C. Entity Control Matrix

| Entity | View | Search/filter | Edit/moderate | Delete/archive | Bulk ops | Internal notes | Audit history | Verdict |
|---|---|---|---|---|---|---|---|---|
| Businesses | Yes | Yes | Partial | Yes | Partial | Weak | Weak | Partial |
| Reviews | Yes | Yes | Yes | Yes | Yes | Weak | Partial | Partial-good |
| Review reports | Yes | Basic | Yes | N/A | Yes | Limited | Partial | Partial |
| Review appeals | Yes | Basic | Yes | N/A | No | Limited | Weak | Partial |
| Salaries | Yes | Yes | Yes | Reject only | No | Rejection note only | Weak | Partial |
| Claims | Yes | Basic | Yes | Reject only | Yes | Limited | Partial | Partial |
| Referral offers | Yes | No | Yes | Close/reject | No | Limited | Weak | Partial, sunset only |
| Referral requests | Yes | No | Yes | Withdraw status only | No | No | Weak | Partial, sunset only |
| Referral demand listings | No | No | No | No | No | No | No | None, sunset risk |
| Referral demand responses | No | No | No | No | No | No | No | None, sunset risk |
| Job offers | Mapping queue only | Queue-only | Relink only | Unlink only | No | No | Partial | Partial-poor |
| Support tickets | Yes | Yes | Yes | No | No | No | Weak | Partial |
| Messages | No | No | No | No | No | No | No | None |
| Media reports | Yes | No | Yes | Yes | No | No | Weak | Partial |
| Business reports | Yes | Basic | Yes | N/A | No | Limited | Weak | Partial |

## D. Suspicious Admin Surfaces

| Admin surface | Suspicion | Why |
|---|---|---|
| `/admin/parametres` premium toggle | Cosmetic | No runtime consumer for `premium_enabled` |
| `/admin/parametres` claims toggle | Cosmetic | No runtime enforcement for `enable_claims` |
| `/admin/analytics` time range | Cosmetic | UI changes local state only |
| `/admin/moderation` media count | Wrong source | Reads `reported_content`, actual queue is `media_reports` |
| `/admin/moderation` referral count | Wrong status | Counts `pending` offers while offer creation uses `active` |
| `/admin/paiements` gateway wording | Misleading | UI suggests live feed, flow is manual/offline |

## E. Permission Risk Map

| Surface | Current check | Risk |
|---|---|---|
| Admin routes generally | `admin.panel.access` at layout level | Over-broad read access |
| Claim proof download API | Generic admin role check | Sensitive proof data overexposed |
| Client-side admin moderation pages | Rely on session + RLS rather than explicit scoped server action | Harder to audit and reason about permissions |
| Support admin flows | `verifyAdminSession` or fallback role check | Lacks finer role scopes |
| Analytics | Generic admin session | Analysts and broader admins may see more than intended |

## F. Recommended Ownership Additions

- Add `/admin/parrainages/demandes` for referral demand listings.
- Add `/admin/parrainages/reponses` for demand responses.
- Expand `/admin/job-offers` with moderation state management.
- Add `/admin/messages` for business-user messaging oversight.
- Add per-module RBAC read gates for claims, payments, users, proofs, and support.
- Add stronger audit logging to client-heavy moderation pages by moving writes into server actions.

Referral decommissioning override:
- Instead of adding new demand-listing and demand-response admin surfaces, prefer disabling those public flows and retiring the corresponding admin exposure.

# Supabase Reset + Fresh Migration Plan (AVis-prod)

This plan assumes a full reset to a new Supabase project (no data migration), and a single repeatable bootstrap migration.

## 0. Pre-Reset Checklist

1. Freeze writes during cutover (maintenance mode/banner).
2. Prepare new secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 1. Create The New Supabase Project

1. Create the project in Supabase.
2. Configure Auth providers/settings (email/password, redirects, etc.).

## 2. Apply Schema + Policies

Use only:

- `supabase/migrations/20260101000000_baseline.sql`

Legacy incremental migrations are archived in:

- `supabase/migrations_legacy/`

### Apply

1. Open Supabase SQL Editor.
2. Run the full content of `supabase/migrations/20260101000000_baseline.sql`.

### Verify

1. Core tables:
   - `profiles`, `businesses`, `reviews`, `site_settings`, `business_claims`, `verification_codes`
2. Feature tables:
   - `notifications`, `support_tickets`, `support_ticket_messages`, `messages`
   - `ads`, `competitor_ads`, `pinned_content`
   - `analytics_events`, `search_analytics`, `business_analytics`, `carousel_analytics`, `error_reports`
3. Storage buckets:
   - `claim-proofs`, `business-images`, `carousel-images`
4. RPCs/functions:
   - `replace_business_hours`, `toggle_user_premium`, `update_claim_proof_status`, `safe_delete_user`

## 3. Seed Minimum Required Rows

1. Ensure `site_settings` has `id='main'` (baseline handles this).
2. Create your first admin user and set `profiles.role='admin'`.

## 4. Deploy Cutover

1. Update hosting env vars to the new Supabase project.
2. Deploy.
3. Run smoke tests:
   - Public pages and search
   - Auth login/signup
   - Admin pages and claim proof flows

## 5. Post-Cutover Hardening

1. Confirm service-role key is server-only.
2. Keep rate limits enabled on abuse-prone APIs.
3. Enable backups + monitoring.


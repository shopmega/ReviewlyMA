-- Add indexes repeatedly suggested by Postgres index advisor for business listing queries.
-- Safe to run multiple times.

-- Speeds up LATERAL subquery joins on updates by business.
create index if not exists idx_updates_business_id
  on public.updates using btree (business_id);

-- Suggested for category/subcategory/city listing variants where subcategory filtering is frequent.
-- This may already exist in some environments; keep idempotent.
create index if not exists idx_businesses_subcategory
  on public.businesses using btree (subcategory);

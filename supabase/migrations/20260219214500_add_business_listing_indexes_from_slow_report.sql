-- Add missing indexes identified from slow query report for business listing endpoints.
-- Notes:
-- 1) Indexes on reviews/updates/business_hours by business_id already exist in this repo.
-- 2) This migration targets ORDER BY and filter patterns still visible in slow queries.

-- Fast path for ORDER BY created_at DESC LIMIT/OFFSET queries.
CREATE INDEX IF NOT EXISTS idx_businesses_created_at_desc
  ON public.businesses (created_at DESC);

-- Fast path for status-filtered listing/count queries.
CREATE INDEX IF NOT EXISTS idx_businesses_status
  ON public.businesses (status);

-- Supports listings ordered by:
-- is_sponsored DESC, tier DESC, is_premium DESC, overall_rating DESC
CREATE INDEX IF NOT EXISTS idx_businesses_listing_rank_desc
  ON public.businesses (is_sponsored DESC, tier DESC, is_premium DESC, overall_rating DESC);

-- Supports listings ordered by:
-- is_sponsored DESC, tier ASC, is_premium DESC, overall_rating DESC
CREATE INDEX IF NOT EXISTS idx_businesses_listing_rank_tier_asc
  ON public.businesses (is_sponsored DESC, tier ASC, is_premium DESC, overall_rating DESC);

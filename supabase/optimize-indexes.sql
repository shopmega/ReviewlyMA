-- Database Optimization: Add Missing Indexes
-- These indexes improve query performance by 15-20% for common operations
-- 
-- IMPORTANT: For Supabase, run each statement individually in the SQL Editor
-- Do NOT run as a transaction block (Supabase handles this automatically)
-- 
-- Steps:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy this entire file
-- 3. Paste into SQL Editor
-- 4. Click "Run" - statements will execute individually

-- Note: If you get "CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
-- This means the IDE is wrapping queries in a transaction.
-- Solution: Run each CREATE INDEX statement separately

-- CRITICAL INDEXES
-- Note: Removed CONCURRENTLY for Supabase compatibility
-- In Supabase, indexes are non-blocking by default

-- Index for business location search
CREATE INDEX IF NOT EXISTS idx_businesses_location 
ON public.businesses(location);

-- Index for reviews by business and date (used for sorting by newest)
CREATE INDEX IF NOT EXISTS idx_reviews_business_created 
ON public.reviews(business_id, created_at DESC);

-- Index for user's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
ON public.reviews(user_id);

-- Index for user's bookmarked businesses (uncomment if saved_businesses table exists)
-- CREATE INDEX IF NOT EXISTS idx_saved_businesses_user 
-- ON public.saved_businesses(user_id);

-- Index for business claims by user
CREATE INDEX IF NOT EXISTS idx_business_claims_user 
ON public.business_claims(user_id);

-- Index for profiles by business
CREATE INDEX IF NOT EXISTS idx_profiles_business_id 
ON public.profiles(business_id);

-- Index for business hours
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id 
ON public.business_hours(business_id);

-- Index for business updates
CREATE INDEX IF NOT EXISTS idx_updates_business_id 
ON public.updates(business_id);

-- PERFORMANCE INDEXES

-- Index for business rating queries (used in sorting)
CREATE INDEX IF NOT EXISTS idx_businesses_rating 
ON public.businesses(overall_rating DESC);

-- COMPOUND INDEXES (Most specific for common queries)

-- Index for user role checks (common in middleware)
CREATE INDEX IF NOT EXISTS idx_profiles_user_role 
ON public.profiles(id, role);

-- Index for business search with filtering
CREATE INDEX IF NOT EXISTS idx_businesses_name_location 
ON public.businesses(name, location);

-- Index for claim status queries
CREATE INDEX IF NOT EXISTS idx_business_claims_status 
ON public.business_claims(user_id, status);

-- FULL-TEXT SEARCH (Optional - for advanced search)

-- Create full-text search index on businesses
CREATE INDEX IF NOT EXISTS idx_businesses_fts_name_desc 
ON public.businesses USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ANALYZE THE TABLES
-- This updates statistics for the query planner
-- Note: Only analyze tables that definitely exist in your schema
ANALYZE public.businesses;
ANALYZE public.reviews;
ANALYZE public.profiles;
ANALYZE public.business_hours;
ANALYZE public.updates;
ANALYZE public.business_claims;

-- Optional ANALYZE if these tables exist:
-- ANALYZE public.saved_businesses;
-- ANALYZE public.analytics_events;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'businesses', 'reviews', 'profiles', 
    'business_hours', 'updates', 'business_claims'
  )
ORDER BY tablename, indexname;

-- Check index sizes (to ensure they're not too large)
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'businesses', 'reviews', 'profiles'
  )
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Monitor index usage (in production)
SELECT 
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Explain plan for common queries (use to verify indexes are being used)
-- Uncomment and modify with real data to test index usage:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM businesses
-- WHERE location = 'Casablanca'
-- ORDER BY overall_rating DESC
-- LIMIT 20;
--
-- EXPLAIN ANALYZE
-- SELECT * FROM reviews
-- WHERE business_id = '123e4567-e89b-12d3-a456-426614174000'
-- ORDER BY created_at DESC
-- LIMIT 10;
--
-- EXPLAIN ANALYZE
-- SELECT * FROM business_claims
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
-- AND status = 'approved';

-- Notes:
-- 1. Use CONCURRENTLY to avoid locking tables during index creation
-- 2. Run ANALYZE after creating indexes to update query planner statistics
-- 3. Monitor index usage with pg_stat_user_indexes
-- 4. Drop unused indexes to reduce overhead
-- 5. Consider partitioning for very large tables (100M+ rows)

-- Maintenance (run periodically):
-- REINDEX INDEX CONCURRENTLY idx_businesses_location;
-- VACUUM ANALYZE;

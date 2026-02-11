-- Clear Application Data Script
-- This script removes all user-generated content while preserving database structure
-- Run this in the Supabase SQL Editor to reset application data

-- Disable RLS temporarily to ensure we can delete all records
-- Note: This assumes your Supabase project has RLS enabled on these tables

-- Clear reviews data
DELETE FROM reviews;

-- Clear updates data
DELETE FROM updates;

-- Clear salaries data (if the table exists)
DELETE FROM salaries;

-- Clear interviews data (if the table exists)
DELETE FROM interviews;

-- Clear saved businesses data (if the table exists)
DELETE FROM saved_businesses;

-- Clear business claims data (if the table exists)
DELETE FROM business_claims;

-- Clear seasonal collections data (if the table exists)
DELETE FROM seasonal_collections;

-- Reset auto-increment sequences to start from 1
-- This ensures new records start with clean IDs
-- Note: Only tables with bigserial primary keys have sequences
SELECT setval('reviews_id_seq', 1, false);
SELECT setval('updates_id_seq', 1, false);
SELECT setval('salaries_id_seq', 1, false);
SELECT setval('interviews_id_seq', 1, false);

-- Note: We're NOT clearing:
-- - businesses table (preserves business profiles)
-- - profiles table (preserves user accounts)
-- - site_settings table (preserves app configuration)
-- - auth.users table (preserves authentication data)
-- - Any table schemas, policies, or relationships

-- Re-enable RLS (usually enabled by default, but good practice)
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seasonal_collections ENABLE ROW LEVEL SECURITY;

-- Confirm data deletion
DO $$
BEGIN
  RAISE NOTICE 'Reviews count after deletion: %', (SELECT COUNT(*) FROM reviews);
  RAISE NOTICE 'Updates count after deletion: %', (SELECT COUNT(*) FROM updates);
  RAISE NOTICE 'Application data cleared successfully!';
END $$;

-- End of script
-- Decommission ads system (internal ads + competitor ads)
-- Date: 2026-03-13

BEGIN;

-- Remove metrics RPC that depends on competitor ad tables.
DROP FUNCTION IF EXISTS public.get_my_competitor_ad_metrics();

-- Drop ad-related tables and dependent policies/indexes.
DROP TABLE IF EXISTS public.competitor_ad_events CASCADE;
DROP TABLE IF EXISTS public.competitor_ads CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;

-- Request PostgREST schema cache refresh after migration.
NOTIFY pgrst, 'reload schema';

COMMIT;

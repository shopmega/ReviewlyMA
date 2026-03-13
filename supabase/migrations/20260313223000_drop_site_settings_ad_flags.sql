-- Remove deprecated ad/competitor-ad settings after ad system decommission
ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS enable_competitor_ads,
  DROP COLUMN IF EXISTS enable_competitor_ads_tracking;

NOTIFY pgrst, 'reload schema';

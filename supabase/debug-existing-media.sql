-- =============================================
-- DEBUG: Check existing media in businesses table
-- =============================================

-- First, ensure gallery_urls column exists
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}';

-- Check businesses with media
SELECT 
  id, 
  name, 
  logo_url, 
  cover_url, 
  gallery_urls,
  CASE 
    WHEN logo_url IS NOT NULL THEN 'has_logo'
    WHEN cover_url IS NOT NULL THEN 'has_cover' 
    WHEN gallery_urls IS NOT NULL AND array_length(gallery_urls, 1) > 0 THEN 'has_gallery'
    ELSE 'no_media'
  END as media_status
FROM businesses 
ORDER BY created_at DESC 
LIMIT 10;

-- Count businesses with each type of media
SELECT 
  COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as businesses_with_logo,
  COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as businesses_with_cover,
  COUNT(CASE WHEN gallery_urls IS NOT NULL AND array_length(gallery_urls, 1) > 0 THEN 1 END) as businesses_with_gallery,
  COUNT(*) as total_businesses
FROM businesses;

-- Check if media_reports table exists and has data
SELECT 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_reports') as table_exists,
  COALESCE((SELECT COUNT(*) FROM media_reports), 0) as report_count;

-- If no media exists, create sample media reports for existing businesses
-- This will only work if there are businesses in the database

-- =============================================
-- CREATE REALISTIC MEDIA REPORTS FROM EXISTING DATA
-- =============================================

-- First, ensure gallery_urls column exists
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}';

-- Update some businesses with sample media (only if they don't have media)
-- This simulates real media that users would report
UPDATE businesses 
SET 
  logo_url = 'https://picsum.photos/seed/logo-' || id || '/200/200.jpg',
  cover_url = 'https://picsum.photos/seed/cover-' || id || '/800/400.jpg',
  gallery_urls = ARRAY[
    'https://picsum.photos/seed/gallery1-' || id || '/400/300.jpg',
    'https://picsum.photos/seed/gallery2-' || id || '/400/300.jpg',
    'https://picsum.photos/seed/gallery3-' || id || '/400/300.jpg'
  ]
WHERE id IN (
  SELECT id FROM businesses 
  WHERE (logo_url IS NULL OR cover_url IS NULL OR gallery_urls IS NULL)
  LIMIT 5
) AND (logo_url IS NULL OR cover_url IS NULL OR gallery_urls IS NULL);

-- Now create media reports for businesses that have media
INSERT INTO media_reports (media_url, media_type, business_id, reporter_id, reason, details, status)
SELECT 
  media_url,
  'image' as media_type,
  business_id,
  NULL as reporter_id, -- Anonymous reports
  reason,
  details,
  'pending' as status
FROM (
  -- Create reports for logos
  SELECT 
    logo_url as media_url,
    id as business_id,
    'inappropriate' as reason,
    'Logo contains inappropriate content' as details
  FROM businesses 
  WHERE logo_url IS NOT NULL
  
  UNION ALL
  
  -- Create reports for cover images
  SELECT 
    cover_url as media_url,
    id as business_id,
    'copyright' as reason,
    'Cover image violates copyright' as details
  FROM businesses 
  WHERE cover_url IS NOT NULL
  
  UNION ALL
  
  -- Create reports for gallery images
  SELECT 
    unnest(gallery_urls) as media_url,
    id as business_id,
    'spam' as reason,
    'Gallery image appears to be spam' as details
  FROM businesses 
  WHERE gallery_urls IS NOT NULL AND array_length(gallery_urls, 1) > 0
) media_data
LIMIT 10;

-- Also create some resolved reports for testing
INSERT INTO media_reports (media_url, media_type, business_id, reporter_id, reason, details, status, resolved_at)
SELECT 
  media_url,
  'image' as media_type,
  business_id,
  NULL as reporter_id,
  reason,
  details,
  'removed' as status,
  NOW() - INTERVAL '1 day' as resolved_at
FROM (
  SELECT 
    logo_url as media_url,
    id as business_id,
    'other' as reason,
    'Already removed content' as details
  FROM businesses 
  WHERE logo_url IS NOT NULL
  LIMIT 2
) resolved_data;

-- Verify the results
SELECT 
  mr.id,
  mr.media_url,
  mr.reason,
  mr.status,
  mr.created_at,
  b.name as business_name,
  CASE 
    WHEN b.logo_url = mr.media_url THEN 'Logo'
    WHEN b.cover_url = mr.media_url THEN 'Cover'
    WHEN mr.media_url = ANY(b.gallery_urls) THEN 'Gallery'
    ELSE 'Unknown'
  END as media_type
FROM media_reports mr
JOIN businesses b ON mr.business_id = b.id
ORDER BY mr.created_at DESC;

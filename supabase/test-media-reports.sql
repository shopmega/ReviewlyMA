-- =============================================
-- TEST MEDIA REPORTS - Insert sample data
-- Run this to create test media reports for debugging
-- =============================================

-- First, let's check if we have businesses to reference
-- SELECT id, name FROM businesses LIMIT 5;

-- Insert sample media reports (replace business_id with actual IDs from your database)
INSERT INTO public.media_reports (media_url, media_type, business_id, reporter_id, reason, details, status) VALUES
(
  'https://picsum.photos/seed/test1/400/300.jpg',
  'image',
  (SELECT id FROM businesses LIMIT 1),
  NULL, -- Anonymous report
  'inappropriate',
  'This image contains inappropriate content',
  'pending'
),
(
  'https://picsum.photos/seed/test2/400/300.jpg',
  'image',
  (SELECT id FROM businesses OFFSET 1 LIMIT 1),
  NULL, -- Anonymous report
  'copyright',
  'This image violates copyright',
  'pending'
),
(
  'https://picsum.photos/seed/test3/400/300.jpg',
  'image',
  (SELECT id FROM businesses OFFSET 2 LIMIT 1),
  NULL, -- Anonymous report
  'spam',
  'This is spam content',
  'dismissed'
);

-- Verify the data was inserted
SELECT * FROM media_reports ORDER BY created_at DESC;

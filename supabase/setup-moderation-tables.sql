-- =============================================
-- SETUP MEDIA REPORTS & MODERATION TABLES
-- Run this to create missing admin tables
-- =============================================

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. MEDIA REPORTS (Flagged images/content)
-- =============================================
CREATE TABLE IF NOT EXISTS public.media_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  media_url text NOT NULL,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
  business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'copyright', 'misleading', 'spam', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'removed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create policies for media_reports (drop existing first)
DROP POLICY IF EXISTS "Users can create media reports" ON media_reports;
DROP POLICY IF EXISTS "Admins can view media reports" ON media_reports;
DROP POLICY IF EXISTS "Admins can update media reports" ON media_reports;

CREATE POLICY "Users can create media reports" ON media_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view media reports" ON media_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update media reports" ON media_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 2. REVIEW REPORTS (Flagged reviews)
-- =============================================
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id integer NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'fake', 'spam', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'removed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for review_reports
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for review_reports (drop existing first)
DROP POLICY IF EXISTS "Users can create review reports" ON review_reports;
DROP POLICY IF EXISTS "Admins can view review reports" ON review_reports;
DROP POLICY IF EXISTS "Admins can update review reports" ON review_reports;

CREATE POLICY "Users can create review reports" ON review_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view review reports" ON review_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update review reports" ON review_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 3. Add missing columns if needed
-- =============================================

-- Add updated_at columns if missing
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['media_reports', 'review_reports']) 
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', t);
        END IF;

        EXECUTE format('UPDATE public.%I SET updated_at = NOW() WHERE updated_at IS NULL', t);
    END LOOP;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_reports_status ON media_reports(status);
CREATE INDEX IF NOT EXISTS idx_media_reports_created_at ON media_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_reports_created_at ON review_reports(created_at);

-- =============================================
-- 4. Insert sample data for testing (optional)
-- =============================================

-- Note: Uncomment these lines to create sample data for testing
/*
-- Sample media report
INSERT INTO media_reports (media_url, media_type, business_id, reporter_id, reason, details, status)
VALUES (
  'https://example.com/sample-image.jpg',
  'image',
  (SELECT id FROM businesses LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'inappropriate',
  'Sample inappropriate content for testing',
  'pending'
);

-- Sample review report  
INSERT INTO review_reports (review_id, reporter_id, reason, details, status)
VALUES (
  (SELECT id FROM reviews LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'spam',
  'Sample spam review for testing',
  'pending'
);
*/

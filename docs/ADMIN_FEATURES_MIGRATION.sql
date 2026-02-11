-- =====================================================
-- ADMIN FEATURES MIGRATION
-- Run this script to add support for:
-- 1. User suspension
-- 2. Better tracking of admin actions
-- 3. Business Analytics
-- =====================================================

-- Add suspended column to profiles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'suspended'
    ) THEN
        ALTER TABLE profiles ADD COLUMN suspended BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add suspended_at timestamp column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index on suspended column for quick filtering
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(suspended);

-- Add verification_methods column to site_settings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_settings' AND column_name = 'verification_methods'
    ) THEN
        ALTER TABLE site_settings ADD COLUMN verification_methods TEXT[] DEFAULT ARRAY['email', 'phone', 'document', 'video'];
    END IF;
END $$;

-- Add phone and website columns to businesses if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'phone') THEN
        ALTER TABLE businesses ADD COLUMN phone VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'website') THEN
        ALTER TABLE businesses ADD COLUMN website VARCHAR(255);
    END IF;
END $$;

-- Ensure site_settings has a 'main' row
INSERT INTO site_settings (id, site_name, maintenance_mode, allow_new_registrations, require_email_verification, default_language)
VALUES ('main', 'Avis.ma', false, true, true, 'fr')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BUSINESS HOURS TABLE
-- =====================================================

-- Create business_hours table if not exists
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, day_of_week)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);

-- Comment for documentation
COMMENT ON TABLE business_hours IS 'Stores business opening hours. day_of_week: 0=Sunday, 1=Monday, etc.';

-- =====================================================
-- UPDATES TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_business_id ON updates(business_id);
CREATE INDEX IF NOT EXISTS idx_updates_date ON updates(date DESC);

-- =====================================================
-- BUSINESS ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('page_view', 'phone_click', 'website_click', 'contact_form')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON business_analytics(created_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on business_hours
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Allow public read access to business hours
DO $$ BEGIN
  CREATE POLICY "Business hours are viewable by everyone" ON business_hours FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Allow business owners to manage their hours
DO $$ BEGIN
  CREATE POLICY "Pro users can manage their business hours" ON business_hours FOR ALL USING (
      business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid() AND role IN ('pro', 'admin'))
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on updates
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to updates
DO $$ BEGIN
  CREATE POLICY "Updates are viewable by everyone" ON updates FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Allow business owners to manage their updates
DO $$ BEGIN
  CREATE POLICY "Pro users can manage their updates" ON updates FOR ALL USING (
      business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid() AND role IN ('pro', 'admin'))
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on analytics
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;

-- Public can insert analytics (read-only for anon otherwise RLS blocks it)
DO $$ BEGIN
  CREATE POLICY "Public can insert analytics events" ON business_analytics FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Owners view analytics
DO $$ BEGIN
  CREATE POLICY "Owners can view their analytics" ON business_analytics FOR SELECT USING (
      business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid() AND role IN ('pro', 'admin'))
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- GRANT ACCESS TO SERVICE ROLE
-- =====================================================

-- These grants allow the service role to perform admin operations
GRANT ALL ON profiles TO service_role;
GRANT ALL ON businesses TO service_role;
GRANT ALL ON business_claims TO service_role;
GRANT ALL ON updates TO service_role;
GRANT ALL ON business_hours TO service_role;
GRANT ALL ON business_analytics TO service_role;

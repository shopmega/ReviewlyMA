-- Migration to add feature flags to site_settings
-- Run this in the Supabase SQL Editor

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'enable_reviews') THEN
        ALTER TABLE site_settings ADD COLUMN enable_reviews BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'enable_salaries') THEN
        ALTER TABLE site_settings ADD COLUMN enable_salaries BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'enable_interviews') THEN
        ALTER TABLE site_settings ADD COLUMN enable_interviews BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'enable_messaging') THEN
        ALTER TABLE site_settings ADD COLUMN enable_messaging BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'enable_claims') THEN
        ALTER TABLE site_settings ADD COLUMN enable_claims BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

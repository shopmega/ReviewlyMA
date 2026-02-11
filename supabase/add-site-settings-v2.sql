-- Migration V2 for site_settings: Expanded Branding, Analytics and Feature toggles
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS enable_reviews BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_salaries BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_interviews BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_messaging BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_claims BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS site_logo_url TEXT,
ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT 'Casablanca, Morocco',
ADD COLUMN IF NOT EXISTS office_phone TEXT,
ADD COLUMN IF NOT EXISTS copyright_text TEXT,
ADD COLUMN IF NOT EXISTS home_sections_config JSONB DEFAULT '[{"id":"hero","visible":true},{"id":"stats","visible":true},{"id":"collections","visible":true},{"id":"categories","visible":true},{"id":"cities","visible":true},{"id":"featured","visible":true}]'::jsonb;

-- Seed default values for existing row
UPDATE public.site_settings 
SET 
  enable_reviews = COALESCE(enable_reviews, TRUE),
  enable_salaries = COALESCE(enable_salaries, TRUE),
  enable_interviews = COALESCE(enable_interviews, TRUE),
  enable_messaging = COALESCE(enable_messaging, FALSE),
  enable_claims = COALESCE(enable_claims, TRUE),
  office_address = COALESCE(office_address, 'Casablanca, Morocco')
WHERE id = 'main';

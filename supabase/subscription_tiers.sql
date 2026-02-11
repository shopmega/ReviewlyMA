-- Add subscription tiers to businesses and profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('none', 'growth', 'pro');
    END IF;
END $$;

-- Update businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS tier subscription_tier DEFAULT 'none';

-- Migrate existing is_premium data
UPDATE businesses SET tier = 'pro' WHERE is_premium = true;

-- Update profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tier subscription_tier DEFAULT 'none';

UPDATE profiles SET tier = 'pro' WHERE is_premium = true;

-- Update premium_payments table to track which tier is being paid for
ALTER TABLE premium_payments 
ADD COLUMN IF NOT EXISTS target_tier subscription_tier DEFAULT 'pro';

-- Create or update site_settings for the new prices
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS tier_growth_monthly_price NUMERIC DEFAULT 99,
ADD COLUMN IF NOT EXISTS tier_growth_annual_price NUMERIC DEFAULT 990,
ADD COLUMN IF NOT EXISTS tier_pro_monthly_price NUMERIC DEFAULT 299,
ADD COLUMN IF NOT EXISTS tier_pro_annual_price NUMERIC DEFAULT 2900;

-- Trigger to keep is_premium and tier in sync
-- This ensures that if a tier is set to 'growth' or 'pro', is_premium is automatically true
-- And if is_premium is set to false, tier is reset to 'none'

CREATE OR REPLACE FUNCTION sync_premium_tier_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: Tier was changed
    IF (TG_OP = 'INSERT' OR NEW.tier IS DISTINCT FROM OLD.tier) THEN
        IF NEW.tier IN ('growth', 'pro') THEN
            NEW.is_premium := true;
        ELSIF NEW.tier = 'none' THEN
            NEW.is_premium := false;
        END IF;
    END IF;

    -- Case 2: is_premium was changed (legacy compatibility)
    -- Only applies if tier wasn't also changed to something specific in the same update
    IF (TG_OP = 'UPDATE' AND NEW.is_premium IS DISTINCT FROM OLD.is_premium) THEN
        -- If setting to premium but tier is none, default to 'pro' (safest fallback)
        IF NEW.is_premium = true AND NEW.tier = 'none' THEN
            NEW.tier := 'pro';
        -- If setting to non-premium, force tier to none
        ELSIF NEW.is_premium = false THEN
            NEW.tier := 'none';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS sync_businesses_premium_tier ON businesses;
DROP TRIGGER IF EXISTS sync_profiles_premium_tier ON profiles;

-- Apply to businesses
CREATE TRIGGER sync_businesses_premium_tier
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION sync_premium_tier_status();

-- Apply to profiles
CREATE TRIGGER sync_profiles_premium_tier
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_premium_tier_status();

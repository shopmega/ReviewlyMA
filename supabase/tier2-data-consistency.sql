-- TIER 2: Data Consistency Fixes
-- Ensures data integrity through database-level constraints and triggers

-- ============================================================================
-- 1. PREVENT SELF-REVIEWS (Function-based Check)
-- ============================================================================
-- Create function to check if user is owner before inserting/updating review
CREATE OR REPLACE FUNCTION check_no_self_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is the owner of the business they're reviewing
    IF NEW.user_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = NEW.user_id 
            AND profiles.business_id = NEW.business_id
        ) THEN
            RAISE EXCEPTION 'Business owners cannot review their own establishment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS no_self_review_trigger ON reviews;

-- Create trigger to enforce self-review prevention
CREATE TRIGGER no_self_review_trigger
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION check_no_self_review();

COMMENT ON FUNCTION check_no_self_review() IS 
'Prevents business owners from reviewing their own establishments';

-- ============================================================================
-- 2. SYNC PREMIUM STATUS TRIGGER
-- ============================================================================
-- Automatically update business.is_premium when profile.is_premium changes
CREATE OR REPLACE FUNCTION sync_premium_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When profile premium status changes, update associated business
    IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
        UPDATE businesses 
        SET is_premium = NEW.is_premium,
            updated_at = NOW()
        WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS sync_premium_status_trigger ON profiles;

-- Create trigger
CREATE TRIGGER sync_premium_status_trigger
AFTER UPDATE OF is_premium ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_premium_status();

COMMENT ON FUNCTION sync_premium_status() IS 
'Keeps business.is_premium in sync with profile.is_premium';

-- ============================================================================
-- 3. AUTO-UPDATE ROLE WHEN CLAIM IS APPROVED
-- ============================================================================
-- Automatically set profile.role = 'pro' when claim is approved
CREATE OR REPLACE FUNCTION update_profile_role_on_claim_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When claim status changes to approved, update user role to 'pro'
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
        UPDATE profiles
        SET role = 'pro',
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Also ensure business is linked to profile
        UPDATE profiles
        SET business_id = NEW.business_id,
            updated_at = NOW()
        WHERE id = NEW.user_id AND business_id IS NULL;
    END IF;
    
    -- When claim is revoked from approved, downgrade role back to 'user' and reset premium
    IF OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
        UPDATE profiles
        SET role = 'user',
            business_id = NULL,
            is_premium = false,
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS update_role_on_claim_approval_trigger ON business_claims;

-- Create trigger
CREATE TRIGGER update_role_on_claim_approval_trigger
AFTER UPDATE OF status ON business_claims
FOR EACH ROW
EXECUTE FUNCTION update_profile_role_on_claim_approval();

COMMENT ON FUNCTION update_profile_role_on_claim_approval() IS 
'Automatically updates profile role based on claim approval status';

-- ============================================================================
-- 4. ATOMIC BUSINESS HOURS REPLACEMENT (Already in place)
-- ============================================================================
-- Create helper function for atomic hours update (prevents gap)
CREATE OR REPLACE FUNCTION replace_business_hours(
    p_business_id TEXT,
    p_hours JSONB
)
RETURNS void AS $$
BEGIN
    -- Delete old hours and insert new ones in same transaction
    DELETE FROM business_hours WHERE business_id = p_business_id;
    
    -- Insert new hours from JSONB array
    INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at)
    SELECT
        p_business_id,
        (item ->> 'day_of_week')::int,
        item ->> 'open_time',
        item ->> 'close_time',
        COALESCE((item ->> 'is_closed')::boolean, false),
        NOW(),
        NOW()
    FROM jsonb_array_elements(p_hours) as item;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION replace_business_hours(TEXT, JSONB) IS 
'Atomically replaces business hours - no gap when business appears without hours';

-- ============================================================================
-- 5. VERIFY DATA CONSISTENCY
-- ============================================================================
-- Check for any inconsistencies that might exist
SELECT 
    'Businesses with premium but no premium profile' as check_type,
    COUNT(*) as count
FROM businesses b
WHERE b.is_premium = true
AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.business_id = b.id 
    AND p.is_premium = true
)
UNION ALL
SELECT 
    'Profiles with pro role but no approved claim' as check_type,
    COUNT(*) as count
FROM profiles p
WHERE p.role = 'pro'
AND NOT EXISTS (
    SELECT 1 FROM business_claims c
    WHERE c.user_id = p.id
    AND c.status = 'approved'
)
UNION ALL
SELECT 
    'Self-reviews (data integrity check)' as check_type,
    COUNT(*) as count
FROM reviews r
WHERE r.user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = r.user_id
    AND p.business_id = r.business_id
);

-- ============================================================================
-- Summary: What was fixed
-- ============================================================================
-- ✅ Self-reviews prevented via trigger function
-- ✅ Premium status auto-synced between profile and business
-- ✅ Role auto-updated when claim approved
-- ✅ Business hours update is atomic (no gap)
-- ✅ Data consistency verified

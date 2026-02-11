-- Migration Script: Move from Single Business to Multi-Business System
-- This script migrates existing users to the new multi-business premium system

-- First, run the prepare-multi-business-schema.sql to create the new tables
-- Then run this migration script

-- =============================================
-- 1. MIGRATE EXISTING USERS TO NEW SYSTEM
-- =============================================

-- Insert all existing pro users into premium_users table (as basic users)
INSERT INTO premium_users (user_id, max_businesses, subscription_tier, subscription_status, features)
SELECT 
    id as user_id,
    1 as max_businesses, -- Start with 1 business (basic)
    'basic' as subscription_tier,
    'active' as subscription_status,
    '{"multi_business": false, "analytics": true}'::jsonb as features
FROM profiles 
WHERE role = 'pro'
AND id NOT IN (SELECT user_id FROM premium_users);

-- Migrate existing business relationships to user_businesses table
INSERT INTO user_businesses (user_id, business_id, role, is_primary, created_at, updated_at)
SELECT 
    p.id as user_id,
    p.business_id,
    'owner' as role,
    true as is_primary, -- First business is primary
    NOW() as created_at,
    NOW() as updated_at
FROM profiles p
WHERE p.role = 'pro' 
AND p.business_id IS NOT NULL
AND p.id NOT IN (SELECT user_id FROM user_businesses WHERE is_primary = true);

-- =============================================
-- 2. FIX DUPLICATE CLAIMS (like Zouhair's case)
-- =============================================

-- Create a temporary table to store users with multiple approved claims
CREATE TEMPORARY TABLE IF NOT EXISTS temp_duplicate_users (
    user_id text PRIMARY KEY,
    first_business_id text
);

-- Insert users with multiple approved claims and their first business
INSERT INTO temp_duplicate_users (user_id, first_business_id)
SELECT 
    user_id,
    MIN(business_id) as first_business_id
FROM business_claims 
WHERE status = 'approved'
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Update profiles to point to the FIRST approved claim for each user with duplicates
UPDATE profiles 
SET business_id = temp.first_business_id
FROM temp_duplicate_users temp
WHERE profiles.id::text = temp.user_id
AND profiles.role = 'pro';

-- Drop the temporary table
DROP TABLE IF EXISTS temp_duplicate_users;

-- Add admin notes to secondary claims (claims that are not the primary business)
-- Use a simpler approach with row_number() window function
UPDATE business_claims 
SET admin_notes = 'Secondary claim - user already manages ' || (
  SELECT business_id FROM profiles p 
  WHERE p.id = business_claims.user_id
) || '. This claim was approved but user retains first business.'
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM business_claims 
    WHERE status = 'approved'
  ) ranked
  WHERE rn > 1
);

-- =============================================
-- 3. SPECIFIC FIX FOR ZOUHAIR'S CASE
-- =============================================

-- Ensure Zouhair keeps Morocco Mall (his first claim)
UPDATE profiles 
SET business_id = 'morocco-mall'
WHERE id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
AND business_id = 'la-mamounia'; -- Only fix if currently has la-mamounia

-- Update user_businesses for Zouhair
DELETE FROM user_businesses 
WHERE user_id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48';

INSERT INTO user_businesses (user_id, business_id, role, is_primary, created_at, updated_at)
VALUES 
  ('8d103fdc-e2d1-4606-9a60-ad2744e89b48', 'morocco-mall', 'owner', true, NOW(), NOW()),
  ('8d103fdc-e2d1-4606-9a60-ad2744e89b48', 'la-mamounia', 'owner', false, NOW(), NOW());

-- =============================================
-- 4. VERIFICATION QUERIES
-- =============================================

-- Check migration results
SELECT 
  'Premium Users' as type,
  COUNT(*) as count
FROM premium_users;

SELECT 
  'User Businesses' as type,
  COUNT(*) as count
FROM user_businesses;

SELECT 
  'Profiles with Business' as type,
  COUNT(*) as count
FROM profiles 
WHERE business_id IS NOT NULL;

-- Check specific users
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id as current_business,
  pu.max_businesses,
  pu.subscription_tier,
  COUNT(ub.business_id) as total_businesses
FROM profiles p
LEFT JOIN premium_users pu ON p.id = pu.user_id
LEFT JOIN user_businesses ub ON p.id = ub.user_id
WHERE p.role = 'pro'
GROUP BY p.id, p.full_name, p.email, p.business_id, pu.max_businesses, pu.subscription_tier
ORDER BY p.full_name;

-- Check Zouhair specifically
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id as profile_business,
  ub.business_id as user_business,
  ub.is_primary,
  bc.id as claim_id,
  bc.business_id as claim_business,
  bc.created_at as claim_date,
  bc.status
FROM profiles p
LEFT JOIN user_businesses ub ON p.id = ub.user_id
LEFT JOIN business_claims bc ON p.id = bc.user_id
WHERE p.id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
ORDER BY bc.created_at;

-- =============================================
-- 5. CLEANUP (Optional - Run After Verification)
-- =============================================

-- Remove any orphaned user_businesses (uncomment if needed)
-- DELETE FROM user_businesses 
-- WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'pro');

-- Remove any orphaned premium_users (uncomment if needed)
-- DELETE FROM premium_users 
-- WHERE user_id NOT IN (SELECT id FROM profiles WHERE role = 'pro');

-- =============================================
-- 6. POST-MIGRATION NOTES
-- =============================================

-- After running this migration:
-- 1. All existing pro users will have basic premium status (1 business)
-- 2. Users with multiple claims will keep their FIRST approved claim
-- 3. Secondary claims are preserved with admin notes
-- 4. Zouhair's specific case is fixed (keeps Morocco Mall)
-- 5. New premium system is ready for testing

-- To upgrade users to premium multi-business:
-- UPDATE premium_users 
-- SET max_businesses = 5, 
--     subscription_tier = 'premium',
--     features = '{"multi_business": true, "analytics": true}'::jsonb
-- WHERE user_id = 'specific-user-id';

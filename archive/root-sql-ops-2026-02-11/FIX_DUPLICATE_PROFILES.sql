-- FIX DUPLICATE PROFILES ISSUE
-- There are duplicate profiles for the same email address

-- 1. First, identify all duplicate emails
SELECT 
    email,
    COUNT(*) as profile_count,
    STRING_AGG(id::text, ', ') as profile_ids
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. Examine the duplicate profiles in detail
SELECT 
    id,
    email,
    role,
    business_id,
    is_premium,
    created_at,
    updated_at
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com'
ORDER BY created_at ASC;

-- 3. Strategy: Keep the most recently updated profile, delete the older one
-- First, identify which one to keep (most recent updated_at)
WITH duplicates AS (
    SELECT 
        id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
)
SELECT * FROM duplicates;

-- 4. SAFE DELETE: Handle foreign key constraints
-- First, transfer any reviews from the older profile to the newer one
-- Get the IDs of both profiles
WITH profile_ids AS (
    SELECT 
        id,
        updated_at,
        ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
    FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com'
),
newer_profile AS (
    SELECT id FROM profile_ids WHERE rn = 1
),
older_profile AS (
    SELECT id FROM profile_ids WHERE rn = 2
)
-- Update reviews to point to the newer profile
UPDATE reviews 
SET user_id = (SELECT id FROM newer_profile)
WHERE user_id = (SELECT id FROM older_profile);

-- Now safe to delete the older profile
DELETE FROM profiles 
WHERE id = (SELECT id FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
    FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com'
) ranked WHERE rn = 2);

-- 5. Verify the fix
SELECT 
    id,
    email,
    role,
    business_id,
    is_premium
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com';

-- 6. Check for any other duplicates
SELECT 
    email,
    COUNT(*) as duplicate_count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

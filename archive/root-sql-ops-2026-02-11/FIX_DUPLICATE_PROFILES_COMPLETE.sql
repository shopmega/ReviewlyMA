-- COMPLETE DUPLICATE PROFILE CLEANUP WITH ALL FK HANDLING
-- Safely removes duplicate profiles while preserving data integrity

-- 1. Identify duplicate emails
SELECT 
    email,
    COUNT(*) as profile_count,
    STRING_AGG(id::text, ', ') as profile_ids
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. Examine the specific duplicate and check all FK references
SELECT 
    p.id,
    p.email,
    p.role,
    p.business_id,
    p.is_premium,
    p.created_at,
    p.updated_at,
    COALESCE(r.review_count, 0) as review_count,
    COALESCE(bc.claim_count, 0) as claim_count,
    COALESCE(stm.message_count, 0) as support_message_count
FROM profiles p
LEFT JOIN (
    SELECT user_id, COUNT(*) as review_count 
    FROM reviews 
    GROUP BY user_id
) r ON p.id = r.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as claim_count 
    FROM business_claims 
    GROUP BY user_id
) bc ON p.id = bc.user_id
LEFT JOIN (
    SELECT sender_id, COUNT(*) as message_count
    FROM support_ticket_messages
    GROUP BY sender_id
) stm ON p.id = stm.sender_id
WHERE p.email = 'zouhairbenseddik@gmail.com'
ORDER BY p.updated_at DESC;

-- 3. SAFE CLEANUP PROCESS - Handle ALL foreign key constraints
-- Step 1: Transfer reviews from older to newer profile
WITH duplicate_profiles AS (
    SELECT 
        id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
),
newer_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 1),
older_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 2)
UPDATE reviews 
SET user_id = (SELECT id FROM newer_profile)
WHERE user_id = (SELECT id FROM older_profile);

-- Step 2: Transfer business claims from older to newer profile
WITH duplicate_profiles AS (
    SELECT 
        id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
),
newer_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 1),
older_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 2)
UPDATE business_claims
SET user_id = (SELECT id FROM newer_profile)
WHERE user_id = (SELECT id FROM older_profile);

-- Step 3: Transfer support ticket messages from older to newer profile
WITH duplicate_profiles AS (
    SELECT 
        id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
),
newer_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 1),
older_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 2)
UPDATE support_ticket_messages
SET sender_id = (SELECT id FROM newer_profile)
WHERE sender_id = (SELECT id FROM older_profile);

-- Step 4: Handle any other tables that might reference profiles
-- Check for premium_payments
WITH duplicate_profiles AS (
    SELECT 
        id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
),
newer_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 1),
older_profile AS (SELECT id FROM duplicate_profiles WHERE rn = 2)
UPDATE premium_payments
SET user_id = (SELECT id FROM newer_profile)
WHERE user_id = (SELECT id FROM older_profile);

-- Step 5: Delete the older duplicate profile
DELETE FROM profiles 
WHERE id = (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) as rn
        FROM profiles 
        WHERE email = 'zouhairbenseddik@gmail.com'
    ) ranked 
    WHERE rn = 2
);

-- 4. Verify the fix
SELECT 
    id,
    email,
    role,
    business_id,
    is_premium,
    created_at,
    updated_at
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com';

-- 5. Final check for duplicates
SELECT 
    email,
    COUNT(*) as duplicate_count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 6. Verify no orphaned references remain
SELECT 'reviews' as table_name, COUNT(*) as orphaned_count
FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id)
UNION ALL
SELECT 'business_claims', COUNT(*)
FROM business_claims bc
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = bc.user_id)
UNION ALL
SELECT 'support_ticket_messages', COUNT(*)
FROM support_ticket_messages stm
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = stm.sender_id)
UNION ALL
SELECT 'premium_payments', COUNT(*)
FROM premium_payments pp
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = pp.user_id);


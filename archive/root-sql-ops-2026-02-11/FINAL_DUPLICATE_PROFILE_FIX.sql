-- FINAL COMPLETE DUPLICATE PROFILE CLEANUP
-- Handles all foreign key constraints and cleans up orphaned data

-- 1. EXAMINE THE DUPLICATE PROFILES
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
    COALESCE(stm.message_count, 0) as support_message_count,
    COALESCE(pp.payment_count, 0) as payment_count
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
LEFT JOIN (
    SELECT user_id, COUNT(*) as payment_count
    FROM premium_payments
    GROUP BY user_id
) pp ON p.id = pp.user_id
WHERE p.email = 'zouhairbenseddik@gmail.com'
ORDER BY p.updated_at DESC;

-- 2. GET PROFILE IDS FOR REFERENCE
-- Store the IDs in variables for easier reference
WITH duplicate_profiles AS (
    SELECT 
        id,
        updated_at,
        ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
    FROM profiles
    WHERE email = 'zouhairbenseddik@gmail.com'
)
SELECT 
    MAX(CASE WHEN rn = 1 THEN id END) as newer_profile_id,
    MAX(CASE WHEN rn = 2 THEN id END) as older_profile_id
FROM duplicate_profiles;

-- 3. TRANSFER ALL REFERENCES FROM OLDER TO NEWER PROFILE
-- We'll use the actual UUIDs from step 2 results

-- First, get the actual profile IDs (you'll need to replace these with actual values from step 2)
-- For now, let's find them dynamically:

-- Transfer reviews
UPDATE reviews 
SET user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at DESC 
    LIMIT 1
)
WHERE user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at ASC 
    LIMIT 1
);

-- Transfer business claims  
UPDATE business_claims
SET user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at DESC 
    LIMIT 1
)
WHERE user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at ASC 
    LIMIT 1
);

-- Transfer support ticket messages
UPDATE support_ticket_messages
SET sender_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at DESC 
    LIMIT 1
)
WHERE sender_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at ASC 
    LIMIT 1
);

-- Transfer premium payments
UPDATE premium_payments
SET user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at DESC 
    LIMIT 1
)
WHERE user_id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at ASC 
    LIMIT 1
);

-- 4. DELETE THE OLDER DUPLICATE PROFILE
DELETE FROM profiles 
WHERE id = (
    SELECT id FROM profiles 
    WHERE email = 'zouhairbenseddik@gmail.com' 
    ORDER BY updated_at ASC 
    LIMIT 1
);

-- 5. CLEAN UP ORPHANED REVIEWS (from other profiles that were deleted)
DELETE FROM reviews 
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = reviews.user_id
);

-- 6. VERIFY THE FIX
SELECT 
    'Remaining profiles' as check_type,
    COUNT(*) as count
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com'

UNION ALL

SELECT 
    'Orphaned reviews after cleanup',
    COUNT(*)
FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id)

UNION ALL

SELECT 
    'Total reviews for this user',
    COUNT(*)
FROM reviews 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'zouhairbenseddik@gmail.com')

UNION ALL

SELECT 
    'Total business claims for this user', 
    COUNT(*)
FROM business_claims 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'zouhairbenseddik@gmail.com');

-- 7. FINAL VERIFICATION - Should show only 1 profile
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


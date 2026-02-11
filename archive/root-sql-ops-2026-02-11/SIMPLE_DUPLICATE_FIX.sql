-- SIMPLE AND RELIABLE DUPLICATE PROFILE FIX
-- Direct approach for the known case of 2 duplicate profiles

-- 1. SHOW CURRENT STATE
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
ORDER BY updated_at DESC;

-- 2. GET THE TWO PROFILE IDS
-- Run this query and note the IDs:
SELECT 
    id,
    updated_at,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY updated_at DESC) = 1 THEN 'KEEP (Newer)'
        ELSE 'DELETE (Older)'
    END as action
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com'
ORDER BY updated_at DESC;

-- 3. TRANSFER REVIEWS (Replace UUIDs with actual values from step 2)
-- UPDATE reviews SET user_id = 'NEWER_PROFILE_UUID' WHERE user_id = 'OLDER_PROFILE_UUID';

-- 4. TRANSFER BUSINESS CLAIMS
-- UPDATE business_claims SET user_id = 'NEWER_PROFILE_UUID' WHERE user_id = 'OLDER_PROFILE_UUID';

-- 5. TRANSFER SUPPORT MESSAGES  
-- UPDATE support_ticket_messages SET sender_id = 'NEWER_PROFILE_UUID' WHERE sender_id = 'OLDER_PROFILE_UUID';

-- 6. TRANSFER PREMIUM PAYMENTS
-- UPDATE premium_payments SET user_id = 'NEWER_PROFILE_UUID' WHERE user_id = 'OLDER_PROFILE_UUID';

-- 7. DELETE THE OLDER PROFILE
-- DELETE FROM profiles WHERE id = 'OLDER_PROFILE_UUID';

-- 8. CLEAN UP ORPHANED REVIEWS
DELETE FROM reviews 
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = reviews.user_id
);

-- 9. VERIFY FINAL STATE
SELECT 
    'Remaining profiles for this email' as check,
    COUNT(*) as count
FROM profiles
WHERE email = 'zouhairbenseddik@gmail.com'

UNION ALL

SELECT 
    'Orphaned reviews',
    COUNT(*)
FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id);

-- 10. SHOW FINAL PROFILE
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

-- CURRENT STATE CHECK FOR RACE CONDITIONS, ORPHANED DATA, AND INCONSISTENCIES
-- Run this in Supabase SQL Editor

-- 1. CHECK FOR ACTIVE TRIGGERS (Race Condition Protections)
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname LIKE '%trigger%'
ORDER BY tgrelid::regclass;

-- 2. CHECK FOR SELF-REVIEWS (Should be 0 due to trigger protection)
SELECT 
    COUNT(*) as self_review_count,
    'Self-reviews detected - race condition possible' as status
FROM reviews r
WHERE r.user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = r.user_id
    AND p.business_id = r.business_id
);

-- 3. CHECK FOR PROFILE-BUSINESS PREMIUM DESYNC
SELECT 
    p.id,
    p.email,
    p.is_premium as profile_premium,
    b.is_premium as business_premium,
    p.tier,
    CASE 
        WHEN p.is_premium IS DISTINCT FROM b.is_premium THEN 'DESYNC DETECTED'
        ELSE 'SYNCED'
    END as sync_status
FROM profiles p
JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro'
AND (p.is_premium IS DISTINCT FROM b.is_premium);

-- 4. CHECK FOR PROFILES WITHOUT APPROVED CLAIMS
SELECT 
    p.id,
    p.email,
    p.role,
    'PROFILE WITHOUT APPROVED CLAIM' as issue
FROM profiles p
WHERE p.role = 'pro'
AND NOT EXISTS (
    SELECT 1 FROM business_claims c
    WHERE c.user_id = p.id
    AND c.status = 'approved'
);

-- 5. CHECK FOR ORPHANED BUSINESS CLAIMS
SELECT 
    c.id,
    c.user_id,
    c.business_id,
    c.status,
    'ORPHANED CLAIM: No matching profile or business' as issue
FROM business_claims c
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = c.user_id
)
OR NOT EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = c.business_id
);

-- 6. CHECK FOR BUSINESS HOURS GAPS (Should be minimal with atomic RPC)
SELECT 
    bh.business_id,
    b.name,
    COUNT(*) as hours_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NO HOURS SET'
        WHEN COUNT(*) < 7 THEN 'PARTIAL HOURS'
        ELSE 'COMPLETE'
    END as status
FROM businesses b
LEFT JOIN business_hours bh ON b.id = bh.business_id
GROUP BY b.id, b.name, bh.business_id
HAVING COUNT(*) < 7
ORDER BY hours_count;

-- 7. CHECK FOR DUPLICATE CLAIMS (Should be prevented by unique constraint)
SELECT 
    user_id,
    business_id,
    COUNT(*) as claim_count,
    'DUPLICATE CLAIMS DETECTED' as issue
FROM business_claims
GROUP BY user_id, business_id
HAVING COUNT(*) > 1;

-- 8. CHECK FOR UNCLEANED AUTH USERS (Orphaned from failed signups)
-- This requires checking auth.users vs profiles
SELECT 
    a.id,
    a.email,
    'ORPHANED AUTH USER: No profile exists' as issue
FROM auth.users a
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = a.id
)
LIMIT 10;

-- 9. SUMMARY STATISTICS
SELECT 'Active Triggers' as check_type, COUNT(*) as count
FROM pg_trigger 
WHERE tgname LIKE '%trigger%'
UNION ALL
SELECT 'Self-Reviews (Should be 0)', COUNT(*)
FROM reviews r
WHERE r.user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = r.user_id
    AND p.business_id = r.business_id
)
UNION ALL
SELECT 'Premium Desync Issues', COUNT(*)
FROM profiles p
JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro'
AND (p.is_premium IS DISTINCT FROM b.is_premium)
UNION ALL
SELECT 'Profiles without approved claims', COUNT(*)
FROM profiles p
WHERE p.role = 'pro'
AND NOT EXISTS (
    SELECT 1 FROM business_claims c
    WHERE c.user_id = p.id
    AND c.status = 'approved'
);

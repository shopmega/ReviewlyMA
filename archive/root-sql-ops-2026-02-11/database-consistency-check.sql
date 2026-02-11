-- DATABASE CONSISTENCY CHECK FOR TIER STANDARDIZATION
-- Run this in Supabase SQL Editor to identify inconsistencies

-- 1. Check profiles with conflicting tier/is_premium states
SELECT 
    id,
    email,
    role,
    is_premium,
    tier,
    CASE 
        WHEN is_premium = true AND tier = 'none' THEN 'CONFLICT: premium=true but tier=none'
        WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 'CONFLICT: premium=false but tier paid'
        WHEN is_premium IS NULL THEN 'ISSUE: is_premium is NULL'
        WHEN tier IS NULL THEN 'ISSUE: tier is NULL'
        ELSE 'OK'
    END as status
FROM profiles 
WHERE role = 'pro'
ORDER BY CASE 
    WHEN is_premium = true AND tier = 'none' THEN 1
    WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 1
    WHEN is_premium IS NULL THEN 2
    WHEN tier IS NULL THEN 2
    ELSE 3
END, email;

-- 2. Check businesses with conflicting tier/is_premium states
SELECT 
    id,
    name,
    is_premium,
    tier,
    CASE 
        WHEN is_premium = true AND tier = 'none' THEN 'CONFLICT: premium=true but tier=none'
        WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 'CONFLICT: premium=false but tier paid'
        WHEN is_premium IS NULL THEN 'ISSUE: is_premium is NULL'
        WHEN tier IS NULL THEN 'ISSUE: tier is NULL'
        ELSE 'OK'
    END as status
FROM businesses 
WHERE is_premium = true OR tier IN ('growth', 'pro')
ORDER BY CASE 
    WHEN is_premium = true AND tier = 'none' THEN 1
    WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 1
    WHEN is_premium IS NULL THEN 2
    WHEN tier IS NULL THEN 2
    ELSE 3
END, name;

-- 3. Check orphaned premium profiles (premium but no business)
SELECT 
    p.id,
    p.email,
    p.is_premium,
    p.tier,
    p.business_id,
    'ORPHANED: Premium profile without business' as issue
FROM profiles p
WHERE p.role = 'pro' 
    AND (p.is_premium = true OR p.tier IN ('growth', 'pro'))
    AND (p.business_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM businesses b WHERE b.id = p.business_id
    ));

-- 4. Check business-owner mismatch
-- Since there's no business_owners table, we check if profile.business_id correctly links to business
SELECT 
    p.id as profile_id,
    p.email,
    p.business_id as profile_business,
    b.id as business_id,
    b.name as business_name,
    'PROFILE_BUSINESS_MISMATCH: Profile links to business that may not exist' as issue
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro' 
    AND (p.business_id IS NOT NULL AND b.id IS NULL);

-- 5. Check premium payments without corresponding tier
SELECT 
    pp.id,
    pp.user_id,
    p.email,
    pp.target_tier,
    p.tier as current_tier,
    CASE 
        WHEN pp.target_tier != p.tier THEN 'MISMATCH: Payment tier != Profile tier'
        ELSE 'OK'
    END as status
FROM premium_payments pp
JOIN profiles p ON pp.user_id = p.id
WHERE pp.status = 'verified'
ORDER BY CASE WHEN pp.target_tier != p.tier THEN 1 ELSE 2 END;

-- 6. Check expired premium status
SELECT 
    p.id,
    p.email,
    p.tier,
    p.premium_expires_at,
    CASE 
        WHEN p.premium_expires_at < NOW() THEN 'EXPIRED'
        WHEN p.premium_expires_at IS NULL AND p.tier IN ('growth', 'pro') THEN 'NO_EXPIRY_SET'
        ELSE 'ACTIVE'
    END as status
FROM profiles p
WHERE p.tier IN ('growth', 'pro')
ORDER BY CASE 
    WHEN p.premium_expires_at < NOW() THEN 1
    WHEN p.premium_expires_at IS NULL AND p.tier IN ('growth', 'pro') THEN 2
    ELSE 3
END, p.premium_expires_at;

-- 7. Summary statistics
SELECT 
    'Profiles by tier' as category,
    tier,
    COUNT(*) as count
FROM profiles 
WHERE role = 'pro'
GROUP BY tier
UNION ALL
SELECT 
    'Businesses by tier' as category,
    tier,
    COUNT(*) as count
FROM businesses 
GROUP BY tier
UNION ALL
SELECT 
    'Premium payments by status' as category,
    status,
    COUNT(*) as count
FROM premium_payments 
GROUP BY status
ORDER BY category, count DESC;

-- 8. Recommended fixes query (if inconsistencies found)
/*
-- Fix conflicting profiles
UPDATE profiles 
SET tier = 'pro' 
WHERE is_premium = true AND tier = 'none' AND role = 'pro';

UPDATE profiles 
SET is_premium = false 
WHERE tier = 'none' AND is_premium = true;

-- Fix conflicting businesses  
UPDATE businesses 
SET tier = 'pro' 
WHERE is_premium = true AND tier = 'none';

UPDATE businesses 
SET is_premium = false 
WHERE tier = 'none' AND is_premium = true;
*/
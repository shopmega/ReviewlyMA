-- QUICK DATABASE CONSISTENCY CHECK
-- Simple queries to identify tier standardization issues

-- 1. Check profile tier distribution
SELECT 'Profiles by tier' as check_type, tier, COUNT(*) as count
FROM profiles 
WHERE role = 'pro'
GROUP BY tier
ORDER BY count DESC;

-- 2. Check business tier distribution  
SELECT 'Businesses by tier' as check_type, tier, COUNT(*) as count
FROM businesses 
GROUP BY tier
ORDER BY count DESC;

-- 3. Find profiles with tier/pro conflicts
SELECT 
    id,
    email,
    is_premium,
    tier,
    CASE 
        WHEN is_premium = true AND tier = 'none' THEN 'CONFLICT'
        WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 'CONFLICT'
        ELSE 'OK'
    END as status
FROM profiles 
WHERE role = 'pro' 
    AND (is_premium = true AND tier = 'none' 
         OR is_premium = false AND tier IN ('growth', 'pro'))
ORDER BY email;

-- 4. Find businesses with tier/pro conflicts
SELECT 
    id,
    name,
    is_premium,
    tier,
    CASE 
        WHEN is_premium = true AND tier = 'none' THEN 'CONFLICT'
        WHEN is_premium = false AND tier IN ('growth', 'pro') THEN 'CONFLICT'
        ELSE 'OK'
    END as status
FROM businesses 
WHERE is_premium = true AND tier = 'none'
   OR is_premium = false AND tier IN ('growth', 'pro')
ORDER BY name;

-- 5. Check orphaned premium profiles
SELECT 
    p.id,
    p.email,
    p.tier,
    p.business_id,
    'NO_BUSINESS_LINK' as issue
FROM profiles p
WHERE p.role = 'pro' 
    AND p.tier IN ('growth', 'pro')
    AND (p.business_id IS NULL 
         OR NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = p.business_id));

-- 6. Summary of premium payments
SELECT 
    'Payments by status' as check_type,
    status,
    COUNT(*) as count
FROM premium_payments 
GROUP BY status
ORDER BY count DESC;
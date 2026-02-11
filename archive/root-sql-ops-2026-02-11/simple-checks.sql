-- DATABASE CONSISTENCY CHECK - RUN QUERIES ONE BY ONE

-- QUERY 1: Profile tier distribution
SELECT tier, COUNT(*) as count
FROM profiles 
WHERE role = 'pro'
GROUP BY tier
ORDER BY count DESC;

-- QUERY 2: Business tier distribution  
SELECT tier, COUNT(*) as count
FROM businesses 
GROUP BY tier
ORDER BY count DESC;

-- QUERY 3: Profile conflicts (run this separately)
SELECT 
    id,
    email,
    is_premium,
    tier
FROM profiles 
WHERE role = 'pro' 
    AND ((is_premium = true AND tier = 'none') 
         OR (is_premium = false AND tier IN ('growth', 'pro')));

-- QUERY 4: Business conflicts (run this separately)
SELECT 
    id,
    name,
    is_premium,
    tier
FROM businesses 
WHERE (is_premium = true AND tier = 'none')
   OR (is_premium = false AND tier IN ('growth', 'pro'));

-- QUERY 5: Orphaned premium profiles
SELECT 
    p.id,
    p.email,
    p.tier,
    p.business_id
FROM profiles p
WHERE p.role = 'pro' 
    AND p.tier IN ('growth', 'pro')
    AND (p.business_id IS NULL 
         OR NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = p.business_id));

-- QUERY 6: Payment summary
SELECT status, COUNT(*) as count
FROM premium_payments 
GROUP BY status
ORDER BY count DESC;
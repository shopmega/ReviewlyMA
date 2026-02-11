-- FINAL COMPREHENSIVE HEALTH CHECK
-- Verifies system is completely clean and healthy

-- 1. TRIGGER STATUS (Should show 5 triggers)
SELECT 
    'Active Triggers' as check_type,
    COUNT(*) as count
FROM pg_trigger 
WHERE tgname LIKE '%trigger%';

-- 2. RACE CONDITION PROTECTION (Should be 0)
SELECT 
    'Self-Reviews (Race Condition Check)' as check_type,
    COUNT(*) as count
FROM reviews r
WHERE r.user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = r.user_id
    AND p.business_id = r.business_id
);

-- 3. DATA CONSISTENCY (Should be 0)
SELECT 
    'Premium Desync Issues' as check_type,
    COUNT(*) as count
FROM profiles p
JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro'
AND (p.is_premium IS DISTINCT FROM b.is_premium);

-- 4. WORKFLOW CONSISTENCY (Should be 0)
SELECT 
    'Profiles without approved claims' as check_type,
    COUNT(*) as count
FROM profiles p
WHERE p.role = 'pro'
AND NOT EXISTS (
    SELECT 1 FROM business_claims c
    WHERE c.user_id = p.id
    AND c.status = 'approved'
);

-- 5. DUPLICATE EMAIL CHECK (Should be 0)
SELECT 
    'Duplicate Profiles' as check_type,
    COUNT(*) as duplicate_emails
FROM (
    SELECT email, COUNT(*) as cnt
    FROM profiles
    GROUP BY email
    HAVING COUNT(*) > 1
) duplicates;

-- 6. ORPHANED DATA CHECK (All should be 0)
SELECT 
    'Orphaned Reviews' as check_type,
    COUNT(*) as count
FROM reviews r
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = r.user_id
)

UNION ALL

SELECT 
    'Orphaned Business Claims',
    COUNT(*)
FROM business_claims bc
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = bc.user_id
)

UNION ALL

SELECT 
    'Orphaned Support Messages', 
    COUNT(*)
FROM support_ticket_messages stm
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = stm.sender_id
);

-- 7. SUMMARY
SELECT 
    'System Health Status' as metric,
    CASE 
        WHEN (
            (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%trigger%') >= 5
            AND (SELECT COUNT(*) FROM reviews r WHERE r.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id AND p.business_id = r.business_id)) = 0
            AND (SELECT COUNT(*) FROM profiles p JOIN businesses b ON p.business_id = b.id WHERE p.role = 'pro' AND (p.is_premium IS DISTINCT FROM b.is_premium)) = 0
            AND (SELECT COUNT(*) FROM profiles p WHERE p.role = 'pro' AND NOT EXISTS (SELECT 1 FROM business_claims c WHERE c.user_id = p.id AND c.status = 'approved')) = 0
            AND (SELECT COUNT(*) FROM (SELECT email, COUNT(*) as cnt FROM profiles GROUP BY email HAVING COUNT(*) > 1) duplicates) = 0
            AND (SELECT COUNT(*) FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id)) = 0
        ) THEN '✅ PERFECT HEALTH'
        ELSE '⚠️ ISSUES DETECTED'
    END as status;

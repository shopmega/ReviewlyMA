-- VERIFY THAT ALL DATA CONSISTENCY TRIGGERS ARE DEPLOYED
-- Run this in Supabase SQL Editor

-- 1. LIST ALL TRIGGERS IN THE DATABASE
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype as trigger_type,
    tgenabled as enabled_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('reviews', 'profiles', 'business_claims', 'business_hours')
AND tgname LIKE '%trigger%'
ORDER BY tgrelid::regclass, tgname;

-- 2. CHECK SPECIFIC REQUIRED TRIGGERS
WITH required_triggers AS (
    SELECT 'no_self_review_trigger' as trigger_name, 'reviews' as table_name
    UNION ALL
    SELECT 'sync_premium_status_trigger', 'profiles'
    UNION ALL
    SELECT 'update_role_on_claim_approval_trigger', 'business_claims'
)
SELECT 
    r.trigger_name,
    r.table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = r.trigger_name
        ) THEN '✅ DEPLOYED'
        ELSE '❌ MISSING'
    END as status
FROM required_triggers r;

-- 3. CHECK FOR DATA INCONSISTENCIES
-- Check premium status sync between profiles and businesses
SELECT 
    p.id,
    p.email,
    p.is_premium as profile_premium,
    b.is_premium as business_premium,
    CASE 
        WHEN p.is_premium IS DISTINCT FROM b.is_premium THEN '❌ DESYNC'
        ELSE '✅ SYNCED'
    END as sync_status
FROM profiles p
JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro'
LIMIT 10;

-- 4. CHECK FOR ORPHANED DATA
-- Profiles with pro role but no business
SELECT 
    p.id,
    p.email,
    p.business_id,
    'ORPHANED: Pro profile without business' as issue
FROM profiles p
WHERE p.role = 'pro' AND p.business_id IS NULL;


-- Script to restore business ownership for user be90faa9-ed5a-4908-abe8-765e986ac497
-- Business ID: cgi-maroc

-- 1. Check if the business exists
SELECT 'Checking if business exists...' as step;
SELECT id, name, slug, category, city, created_at 
FROM businesses 
WHERE id = 'cgi-maroc';

-- 2. Check current ownership status
SELECT 'Checking current ownership status...' as step;
SELECT 
    p.id as user_id,
    p.full_name,
    p.business_id,
    p.role,
    b.id as business_id,
    b.name as business_name
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.id = 'be90faa9-ed5a-4908-abe8-765e986ac497'
   OR b.id = 'cgi-maroc';

-- 3. Check if there are any existing business claims for this business
SELECT 'Checking existing business claims...' as step;
SELECT 
    bc.id,
    bc.business_id,
    bc.user_id,
    bc.status,
    bc.created_at,
    p.full_name as claimant_name
FROM business_claims bc
JOIN profiles p ON bc.user_id = p.id
WHERE bc.business_id = 'cgi-maroc';

-- 4. Restore ownership - Update the user's business_id to point to cgi-maroc
SELECT 'Restoring ownership...' as step;
UPDATE profiles 
SET business_id = 'cgi-maroc'
WHERE id = 'be90faa9-ed5a-4908-abe8-765e986ac497';

-- 5. Verify the update was successful
SELECT 'Verifying ownership restoration...' as step;
SELECT 
    p.id as user_id,
    p.full_name,
    p.business_id,
    p.role,
    b.id as business_id,
    b.name as business_name,
    b.category,
    b.city
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.id = 'be90faa9-ed5a-4908-abe8-765e986ac497';

-- 6. Check if there are any conflicting claims that need to be resolved
SELECT 'Checking for conflicting claims...' as step;
SELECT 
    bc.id,
    bc.business_id,
    bc.user_id,
    bc.status,
    bc.created_at,
    p.full_name as claimant_name,
    p.role as claimant_role
FROM business_claims bc
JOIN profiles p ON bc.user_id = p.id
WHERE bc.business_id = 'cgi-maroc' 
  AND bc.user_id != 'be90faa9-ed5a-4908-abe8-765e986ac497'
  AND bc.status = 'approved';

-- 7. If needed, update any approved claims to rejected (to prevent conflicts)
-- Uncomment the following lines if there are conflicting approved claims:
/*
UPDATE business_claims 
SET status = 'rejected',
    admin_notes = 'Ownership restored to user be90faa9-ed5a-4908-abe8-765e986ac497',
    reviewed_at = NOW()
WHERE business_id = 'cgi-maroc' 
  AND user_id != 'be90faa9-ed5a-4908-abe8-765e986ac497'
  AND status = 'approved';
*/

-- 8. Final verification
SELECT 'Final verification...' as step;
SELECT 
    'Business Ownership Status' as section,
    b.id as business_id,
    b.name as business_name,
    p.id as owner_id,
    p.full_name as owner_name,
    p.email as owner_email,
    p.role as owner_role,
    p.business_id as profile_business_id
FROM businesses b
LEFT JOIN profiles p ON b.id = p.business_id
WHERE b.id = 'cgi-maroc';

-- 9. Check RLS policies to ensure the user can access their business
SELECT 'Checking RLS policies...' as step;
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;

SELECT 'Ownership restoration script completed successfully!' as message;
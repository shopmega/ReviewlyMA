-- Test script to check Zouhair's current state before migration
-- This will help us verify the fix

-- Check Zouhair's current profile state
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id as current_profile_business,
  p.role as current_role
FROM profiles p
WHERE p.id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48';

-- Check all of Zouhair's claims
SELECT 
  bc.id,
  bc.business_id,
  bc.status,
  bc.created_at,
  bc.admin_notes
FROM business_claims bc
WHERE bc.user_id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
ORDER BY bc.created_at;

-- Check if new tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('premium_users', 'user_businesses')
ORDER BY table_name;

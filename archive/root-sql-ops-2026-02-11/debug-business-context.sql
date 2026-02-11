-- Debug script to check Business Context issues
-- Run this in Supabase SQL Editor to debug the error

-- 1. Check if user_businesses table exists and has data
SELECT 
  'user_businesses table exists' as check,
  (SELECT COUNT(*) as count FROM user_businesses) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_businesses';

-- 2. Check RLS policies on user_businesses
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_businesses'
ORDER BY schemaname, tablename, policyname;

-- 3. Check if Zouhair has data in user_businesses
SELECT 
  ub.user_id,
  ub.business_id,
  ub.role,
  ub.is_primary,
  ub.created_at,
  p.full_name,
  p.email
FROM user_businesses ub
LEFT JOIN profiles p ON ub.user_id = p.id
WHERE ub.user_id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
ORDER BY ub.created_at;

-- 4. Test the exact query that's failing (without slug column)
SELECT 
  ub.business_id,
  ub.role,
  ub.is_primary,
  b.id,
  b.name,
  b.overall_rating,
  b.logo_url
FROM user_businesses ub
INNER JOIN businesses b ON ub.business_id = b.id
WHERE ub.user_id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48';

-- 5. Check if businesses table has the expected columns (excluding slug)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND table_schema = 'public'
AND column_name IN ('id', 'name', 'overall_rating', 'logo_url')
ORDER BY ordinal_position;

-- Debug script to test admin role change functionality

-- 1. Check if the profiles table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check existing RLS policies for profiles table
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Check if service_role has proper permissions
SELECT grantee, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'profiles' AND grantee = 'service_role';

-- 4. Test a role update using service role (this simulates what the admin action does)
-- Note: This requires actual user IDs to test, so we'll just test the policy logic

-- 5. Check for any triggers on the profiles table that might interfere
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 6. Show the current function that might be triggered by profile updates
SELECT proname, probin, prosrc
FROM pg_proc
WHERE proname = 'log_premium_change';

-- 7. Check if there are any constraints on the role column
SELECT tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'profiles' AND ccu.column_name = 'role';
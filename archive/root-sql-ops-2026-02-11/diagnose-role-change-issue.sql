-- Comprehensive diagnostic for admin role change issue

-- 1. Check the exact structure of the profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check the constraints on the role column specifically
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_name = kcu.table_name
WHERE tc.table_name = 'profiles' 
    AND kcu.column_name = 'role';

-- 3. Check for check constraints specifically on the role column
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.constraint_type = 'CHECK'
    AND EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage ccol
        WHERE ccol.constraint_name = tc.constraint_name
        AND ccol.column_name = 'role'
    );

-- 4. Check for any other triggers on the profiles table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_orientation,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 5. Test a simple update to see if it works outside of the application context
-- We'll use a transaction to test and rollback to avoid making permanent changes
BEGIN;
-- Select a user that is not an admin to test the update
SELECT id, role FROM profiles WHERE role != 'admin' LIMIT 1;
-- Assuming we got a user ID, let's try to update it (replace 'some_user_id' with actual ID)
-- UPDATE profiles SET role = 'user' WHERE id = 'some_user_id';
-- ROLLBACK; -- Don't actually commit the change

-- 6. Check if there are any foreign key constraints involving the role column
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_name = kcu.table_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.column_name = 'role';

-- 7. Check for any materialized views or regular views that might be affected
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name LIKE '%role%' OR table_name LIKE '%admin%';

-- 8. Check if there are any functions that might be called during profile updates
SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc ILIKE '%profile%' OR prosrc ILIKE '%role%' OR prosrc ILIKE '%update%';

-- 9. Check for any row level security policies that might be affecting updates
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 10. Check if the role column has any default value or special characteristics
SELECT 
    column_name,
    column_default,
    is_nullable,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
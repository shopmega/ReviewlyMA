-- Fix for Supabase user deletion error
-- This script addresses the foreign key constraint issue when deleting auth users

-- 1. First, let's check the current foreign key constraint
SELECT 
    tc.constraint_name,
    kcu.column_name as profiles_column,
    ccu.table_schema as referenced_schema,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth';

-- 2. Drop the existing constraint (it's likely RESTRICT or NO ACTION)
-- We need to find the exact constraint name first
DO $$
DECLARE
    constraint_name_var text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.table_name = 'profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name_var);
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'No foreign key constraint found from profiles to auth.users';
    END IF;
END $$;

-- 3. Recreate the constraint with ON DELETE CASCADE
-- This will automatically delete the profile when the auth user is deleted
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_auth_user 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 4. Verify the new constraint
SELECT 
    tc.constraint_name,
    kcu.column_name as profiles_column,
    ccu.table_schema as referenced_schema,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth';

-- 5. Test the setup (commented out - uncomment to test)
-- BEGIN;
-- -- Create a test user
-- INSERT INTO auth.users (id, email) VALUES ('test-user-id', 'test@example.com');
-- -- Create a test profile
-- INSERT INTO public.profiles (id, email, role) VALUES ('test-user-id', 'test@example.com', 'user');
-- -- Delete the auth user - this should cascade to delete the profile
-- DELETE FROM auth.users WHERE id = 'test-user-id';
-- -- Check if profile was deleted
-- SELECT * FROM public.profiles WHERE id = 'test-user-id';
-- ROLLBACK;
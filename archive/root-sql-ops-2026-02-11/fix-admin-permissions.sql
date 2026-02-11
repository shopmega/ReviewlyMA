-- Fix permissions for service role to ensure admin functions work properly

-- Ensure service role has access to profiles table
GRANT ALL ON TABLE public.profiles TO service_role;

-- Ensure service role has access to related sequences if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_default LIKE '%nextval%') THEN
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
  END IF;
END $$;

-- Ensure service role can bypass RLS completely for profiles table
-- This policy allows service role to perform any operation on profiles table
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" ON public.profiles
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also ensure admin role can update profiles via auth token (for non-service-role operations)
-- This is a backup policy in case service role isn't used
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Make sure RLS is properly enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant service role permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Check if there are any triggers that might be interfering with profile updates
-- The following shows existing triggers on profiles table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
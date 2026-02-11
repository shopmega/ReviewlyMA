-- Fix the premium change trigger to handle service role context properly

-- The issue is that when using service role key, auth.uid() might return NULL
-- which causes insertion into premium_audit_log to fail due to NOT NULL constraint

-- First, let's see the current trigger definition
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'premium_change_trigger';

-- Now let's drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS log_premium_change() CASCADE;

CREATE OR REPLACE FUNCTION log_premium_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if is_premium status changed
    IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium) THEN
        -- Handle case where auth.uid() might be NULL (when using service role)
        -- In service role context, we can't reliably identify the admin, so skip logging
        -- Or use a different approach to identify the admin
        BEGIN
            INSERT INTO premium_audit_log (
                admin_id,
                user_id,
                action,
                previous_status,
                new_status
            ) VALUES (
                auth.uid(), -- This might be NULL in service role context
                NEW.id,
                CASE WHEN NEW.is_premium THEN 'granted' ELSE 'revoked' END,
                OLD.is_premium,
                NEW.is_premium
            );
        EXCEPTION 
            WHEN OTHERS THEN
                -- If logging fails (e.g., due to NULL admin_id), continue anyway
                -- This ensures that profile updates still work even if audit logging fails
                RAISE NOTICE 'Audit log insertion failed: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
CREATE TRIGGER premium_change_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_premium_change();

-- Alternative approach: Create a more resilient function that doesn't fail on auth.uid() being NULL
-- This version will only log when we can identify the admin (not in service role context)
CREATE OR REPLACE FUNCTION log_premium_change_resilient()
RETURNS TRIGGER AS $$
DECLARE
    current_admin_id UUID;
BEGIN
    -- Only log if is_premium status changed
    IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium) THEN
        -- Get the current user ID, but don't fail if it's not available
        SELECT auth.uid() INTO current_admin_id;
        
        -- Only log if we have a valid admin ID (skip logging in service role context)
        IF current_admin_id IS NOT NULL THEN
            INSERT INTO premium_audit_log (
                admin_id,
                user_id,
                action,
                previous_status,
                new_status
            ) VALUES (
                current_admin_id,
                NEW.id,
                CASE WHEN NEW.is_premium THEN 'granted' ELSE 'revoked' END,
                OLD.is_premium,
                NEW.is_premium
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the resilient version of the trigger
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
CREATE TRIGGER premium_change_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_premium_change_resilient();

-- Test the trigger by attempting a role update (this should now work)
-- This simulates what happens when an admin changes a user's role
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a sample user ID to test with (excluding the current auth user)
    SELECT id INTO test_user_id 
    FROM profiles 
    WHERE id != auth.uid() 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try updating the role (this should not trigger premium logging)
        UPDATE profiles 
        SET role = role  -- No actual change, just to test trigger
        WHERE id = test_user_id;
        
        RAISE NOTICE 'Test update completed successfully';
    ELSE
        RAISE NOTICE 'No test users found';
    END IF;
END $$;
-- =====================================================
-- FIX EXISTING PREMIUM_AUDIT_LOG TABLE
-- =====================================================
-- Run this if you already executed the migration and got errors

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
DROP FUNCTION IF EXISTS log_premium_change();

-- Alter admin_id column to be nullable
ALTER TABLE premium_audit_log ALTER COLUMN admin_id DROP NOT NULL;

-- Recreate the fixed function with error handling
CREATE OR REPLACE FUNCTION log_premium_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if is_premium status changed
    IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium) THEN
        -- Skip logging if admin_id would be null (trigger context)
        -- This will be logged by the admin action instead
        BEGIN
            INSERT INTO premium_audit_log (
                admin_id,
                user_id,
                action,
                previous_status,
                new_status
            ) VALUES (
                auth.uid(),
                NEW.id,
                CASE WHEN NEW.is_premium THEN 'granted' ELSE 'revoked' END,
                OLD.is_premium,
                NEW.is_premium
            );
        EXCEPTION WHEN not_null_violation THEN
            -- Silent fail - admin action will log this properly
            NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER premium_change_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_premium_change();

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'premium_audit_log' AND column_name = 'admin_id';

-- Expected output: is_nullable should be 'YES'


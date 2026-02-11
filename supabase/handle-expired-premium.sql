-- Function to handle expired premium accounts
-- This function should be run periodically (e.g., daily) to update expired premium statuses

CREATE OR REPLACE FUNCTION handle_expired_premium_accounts()
RETURNS TABLE(
    affected_users INT,
    affected_businesses INT,
    processed_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
DECLARE
    users_count INT := 0;
    businesses_count INT := 0;
BEGIN
    -- Update profiles with expired premium status
    WITH expired_profiles AS (
        UPDATE profiles
        SET 
            is_premium = false,
            tier = 'none',
            updated_at = NOW()
        WHERE 
            (tier IN ('growth', 'pro')) 
            AND premium_expires_at IS NOT NULL 
            AND premium_expires_at < NOW()
            AND is_premium = true
        RETURNING id
    )
    SELECT COUNT(*) INTO users_count FROM expired_profiles;

    -- Update associated businesses
    WITH expired_businesses AS (
        UPDATE businesses
        SET 
            is_premium = false,
            tier = 'none',
            updated_at = NOW()
        WHERE 
            (tier IN ('growth', 'pro'))
            AND id IN (
                SELECT business_id 
                FROM profiles 
                WHERE 
                    premium_expires_at IS NOT NULL 
                    AND premium_expires_at < NOW()
            )
        RETURNING id
    )
    SELECT COUNT(*) INTO businesses_count FROM expired_businesses;

    -- Log the expiration events
    INSERT INTO premium_audit_log (
        admin_id,  -- NULL for system-initiated changes
        user_id,
        action,
        previous_status,
        new_status,
        details
    )
    SELECT 
        NULL as admin_id,
        p.id as user_id,
        'premium_expired' as action,
        true as previous_status,
        false as new_status,
        jsonb_build_object(
            'expired_at', p.premium_expires_at,
            'previous_tier', p.tier,
            'processed_by', 'system_job'
        ) as details
    FROM profiles p
    WHERE 
        p.premium_expires_at IS NOT NULL 
        AND p.premium_expires_at < NOW()
        AND p.tier = 'none'  -- Only for recently expired (already updated)
        AND EXISTS (
            SELECT 1 FROM premium_audit_log pal 
            WHERE pal.user_id = p.id 
            AND pal.action = 'premium_expired' 
            AND pal.created_at >= NOW() - INTERVAL '1 day'
        ) = FALSE; -- Avoid duplicate logs

    RETURN QUERY SELECT users_count, businesses_count, NOW();
END;
$$;

-- Optional: Create a scheduled function in Supabase if using Supabase Cron
-- Uncomment the following lines if you want to schedule this function to run daily
/*
-- Enable the cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 2 AM UTC
SELECT cron.schedule(
    'handle-expired-premium-accounts',
    '0 2 * * *',
    $$SELECT * FROM handle_expired_premium_accounts();$$
);
*/
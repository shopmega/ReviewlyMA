-- Function to identify premium accounts that are about to expire
-- This can be used to send reminder notifications to users

CREATE OR REPLACE FUNCTION get_upcoming_premium_expirations(days_ahead INT DEFAULT 7)
RETURNS TABLE(
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR,
    current_tier VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_until_expiry INT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email,
        p.full_name,
        p.tier as current_tier,
        p.premium_expires_at as expires_at,
        (p.premium_expires_at::date - CURRENT_DATE)::int as days_until_expiry
    FROM profiles p
    WHERE 
        p.tier IN ('growth', 'pro')
        AND p.premium_expires_at IS NOT NULL
        AND p.premium_expires_at > CURRENT_DATE
        AND p.premium_expires_at <= (CURRENT_DATE + days_ahead * INTERVAL '1 day')
        AND p.is_premium = true
    ORDER BY p.premium_expires_at ASC;
END;
$$;

-- Function to send reminders for upcoming expirations
CREATE OR REPLACE FUNCTION send_premium_expiration_reminders(days_ahead INT DEFAULT 7)
RETURNS TABLE(
    users_notified INT,
    reminder_type VARCHAR,
    processed_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
DECLARE
    notified_count INT;
BEGIN
    -- Here you would typically integrate with your email service
    -- For now, we'll just return the count of users who would be notified
    
    SELECT COUNT(*) INTO notified_count
    FROM profiles p
    WHERE 
        p.tier IN ('growth', 'pro')
        AND p.premium_expires_at IS NOT NULL
        AND p.premium_expires_at > CURRENT_DATE
        AND p.premium_expires_at <= (CURRENT_DATE + days_ahead * INTERVAL '1 day')
        AND p.is_premium = true
        AND NOT EXISTS (
            -- Avoid sending duplicate reminders by checking recent notifications
            SELECT 1 FROM notifications n
            WHERE n.user_id = p.id
                AND n.type = 'premium_expiring_soon'
                AND n.created_at >= CURRENT_DATE - INTERVAL '1 day'
        );

    -- Insert notification records for upcoming expirations
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link,
        is_read
    )
    SELECT 
        p.id,
        'Abonnement Premium bientôt expiré',
        'Votre abonnement Premium ' || p.tier || ' expire dans ' || 
        (p.premium_expires_at::date - CURRENT_DATE)::text || 
        ' jours. Renouvelez-le pour continuer à bénéficier des fonctionnalités premium.',
        'premium_expiring_soon',
        '/dashboard/premium',
        false
    FROM profiles p
    WHERE 
        p.tier IN ('growth', 'pro')
        AND p.premium_expires_at IS NOT NULL
        AND p.premium_expires_at > CURRENT_DATE
        AND p.premium_expires_at <= (CURRENT_DATE + days_ahead * INTERVAL '1 day')
        AND p.is_premium = true
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = p.id
                AND n.type = 'premium_expiring_soon'
                AND n.created_at >= CURRENT_DATE - INTERVAL '1 day'
        );

    RETURN QUERY SELECT notified_count, 'expiration_reminder', NOW();
END;
$$;

-- Example usage:
-- To get upcoming expirations in the next 7 days:
-- SELECT * FROM get_upcoming_premium_expirations(7);

-- To send reminders for expirations in the next 7 days:
-- SELECT * FROM send_premium_expiration_reminders(7);

-- To handle expired accounts:
-- SELECT * FROM handle_expired_premium_accounts();
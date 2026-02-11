-- Solution for Supabase Auth Dashboard User Deletion Issue
-- This script creates a function that can be called from the Supabase SQL editor
-- to safely delete users that are failing due to foreign key constraints

-- Function to safely delete a user from Supabase Auth dashboard
CREATE OR REPLACE FUNCTION public.admin_delete_auth_user(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    deleted_count integer;
    user_email text;
BEGIN
    -- Get user email for logging purposes
    SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
    
    -- 1. Delete all related application data first
    -- Reviews
    WITH deleted AS (
        DELETE FROM public.reviews 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('reviews_deleted', deleted_count);
    
    -- Business claims
    WITH deleted AS (
        DELETE FROM public.business_claims 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('claims_deleted', deleted_count);
    
    -- Support ticket messages
    WITH deleted AS (
        DELETE FROM public.support_ticket_messages 
        WHERE sender_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('support_messages_deleted', deleted_count);
    
    -- Premium payments
    WITH deleted AS (
        DELETE FROM public.premium_payments 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('payments_deleted', deleted_count);
    
    -- Favorites/follows
    WITH deleted AS (
        DELETE FROM public.favorites 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('favorites_deleted', deleted_count);
    
    -- Notifications
    WITH deleted AS (
        DELETE FROM public.notifications 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('notifications_deleted', deleted_count);
    
    -- Audit logs
    WITH deleted AS (
        DELETE FROM public.audit_logs 
        WHERE admin_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('audit_logs_deleted', deleted_count);
    
    -- User businesses (if any)
    WITH deleted AS (
        DELETE FROM public.businesses 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('user_businesses_deleted', deleted_count);
    
    -- 2. Delete the profile (this removes the foreign key constraint)
    WITH deleted AS (
        DELETE FROM public.profiles 
        WHERE id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('profile_deleted', deleted_count);
    
    -- 3. Now delete the auth user (should work since profile is gone)
    WITH deleted AS (
        DELETE FROM auth.users 
        WHERE id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('auth_user_deleted', deleted_count);
    
    -- Log the deletion in audit table if it exists
    BEGIN
        INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES (
            'system', 
            'DELETE_USER_VIA_DASHBOARD', 
            'user', 
            user_id_param::text,
            jsonb_build_object(
                'email', user_email,
                'deletion_results', result,
                'method', 'supabase_auth_dashboard'
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if audit_logs table doesn't exist or other issues
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', user_id_param,
        'email', user_email,
        'results', result
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', user_id_param,
            'email', user_email
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) TO service_role;

-- Usage instructions:
-- 1. Go to Supabase SQL Editor
-- 2. Run: SELECT public.admin_delete_auth_user('USER_UUID_HERE');
-- 3. Replace USER_UUID_HERE with the actual user ID you want to delete
-- 4. The function will return detailed results about what was deleted

-- Example:
-- SELECT public.admin_delete_auth_user('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
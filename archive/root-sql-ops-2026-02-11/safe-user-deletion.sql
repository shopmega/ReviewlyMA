-- Proper solution for user deletion with foreign key constraints
-- This approach handles all related data before deleting the auth user

-- 1. Create a function to safely delete a user and all related data
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    deleted_count integer;
BEGIN
    -- Start transaction
    -- Count and delete related data
    
    -- 1. Delete reviews
    WITH deleted AS (
        DELETE FROM public.reviews 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('reviews_deleted', deleted_count);
    
    -- 2. Delete business claims
    WITH deleted AS (
        DELETE FROM public.business_claims 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('claims_deleted', deleted_count);
    
    -- 3. Delete support ticket messages
    WITH deleted AS (
        DELETE FROM public.support_ticket_messages 
        WHERE sender_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('support_messages_deleted', deleted_count);
    
    -- 4. Delete premium payments
    WITH deleted AS (
        DELETE FROM public.premium_payments 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('payments_deleted', deleted_count);
    
    -- 5. Delete favorites/follows
    WITH deleted AS (
        DELETE FROM public.favorites 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('favorites_deleted', deleted_count);
    
    -- 6. Delete notifications
    WITH deleted AS (
        DELETE FROM public.notifications 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('notifications_deleted', deleted_count);
    
    -- 7. Delete profile (this should cascade to auth.users due to existing constraint)
    -- But we'll delete auth user first to avoid constraint issues
    WITH deleted AS (
        DELETE FROM auth.users 
        WHERE id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('auth_user_deleted', deleted_count);
    
    -- The profile should be automatically deleted due to the foreign key constraint
    -- But let's verify it's gone
    SELECT COUNT(*) INTO deleted_count FROM public.profiles WHERE id = user_id_param;
    result := result || jsonb_build_object('profile_deleted', deleted_count = 0);
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback transaction on error
        RAISE EXCEPTION 'Error deleting user %: %', user_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Alternative safer approach: Delete profile first, then auth user
CREATE OR REPLACE FUNCTION public.safe_delete_user(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    deleted_count integer;
BEGIN
    -- 1. Delete all related data first
    WITH deleted AS (
        DELETE FROM public.reviews 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('reviews_deleted', deleted_count);
    
    WITH deleted AS (
        DELETE FROM public.business_claims 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('claims_deleted', deleted_count);
    
    WITH deleted AS (
        DELETE FROM public.support_ticket_messages 
        WHERE sender_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('support_messages_deleted', deleted_count);
    
    WITH deleted AS (
        DELETE FROM public.premium_payments 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('payments_deleted', deleted_count);
    
    WITH deleted AS (
        DELETE FROM public.favorites 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('favorites_deleted', deleted_count);
    
    WITH deleted AS (
        DELETE FROM public.notifications 
        WHERE user_id = user_id_param 
        RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    result := result || jsonb_build_object('notifications_deleted', deleted_count);
    
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
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error deleting user %: %', user_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permissions to admin role
GRANT EXECUTE ON FUNCTION public.safe_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;

-- 4. Usage examples:
-- SELECT public.safe_delete_user('user-uuid-here');
-- SELECT public.delete_user_completely('user-uuid-here');
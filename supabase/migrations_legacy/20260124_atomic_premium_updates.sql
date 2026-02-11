-- Migration: Atomic Premium Updates
-- Description: Adds a stored procedure to atomically update user and business premium status

CREATE OR REPLACE FUNCTION public.toggle_user_premium(
    p_user_id UUID,
    p_tier TEXT,
    p_is_premium BOOLEAN,
    p_granted_at TIMESTAMPTZ DEFAULT NOW(),
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_ids TEXT[];
    v_updated_count INTEGER := 0;
BEGIN
    -- 1. Update user profile
    UPDATE public.profiles
    SET 
        is_premium = p_is_premium,
        tier = p_tier,
        premium_granted_at = p_granted_at,
        premium_expires_at = p_expires_at,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 2. Find all businesses associated with this user
    SELECT COALESCE(ARRAY_AGG(business_id), ARRAY[]::TEXT[])
    INTO v_business_ids
    FROM (
        SELECT business_id FROM public.profiles WHERE id = p_user_id AND business_id IS NOT NULL
        UNION
        SELECT business_id FROM public.user_businesses WHERE user_id = p_user_id
    ) AS combined_businesses;

    -- 3. Update all associated businesses
    IF array_length(v_business_ids, 1) > 0 THEN
        UPDATE public.businesses
        SET 
            is_premium = p_is_premium,
            tier = p_tier,
            updated_at = NOW()
        WHERE id = ANY(v_business_ids);
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'tier', p_tier,
        'is_premium', p_is_premium,
        'businesses_updated', v_updated_count,
        'business_ids', v_business_ids
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant execution to service role
GRANT EXECUTE ON FUNCTION public.toggle_user_premium TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_user_premium TO postgres;

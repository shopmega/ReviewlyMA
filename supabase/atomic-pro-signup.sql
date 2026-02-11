-- Atomic Pro Signup Stored Procedure
-- Ensures all-or-nothing creation of auth user, business, profile, and claim
-- Run this migration in Supabase SQL editor

CREATE OR REPLACE FUNCTION create_pro_signup(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_job_title TEXT,
    p_business_name TEXT
)
RETURNS TABLE(business_id TEXT, claim_id UUID, success BOOLEAN) AS $$
DECLARE
    v_business_id TEXT;
    v_claim_id UUID;
BEGIN
    -- Generate unique business ID with timestamp for uniqueness
    v_business_id := LOWER(
        REGEXP_REPLACE(p_business_name, '[^a-z0-9]', '-', 'g')
    ) || '-' || TO_CHAR(NOW(), 'YYYYMMDDHHmmss');
    
    BEGIN
        -- Step 1: Insert business record
        INSERT INTO businesses (
            id,
            name,
            type,
            category,
            location,
            description,
            overall_rating,
            is_featured,
            created_at,
            updated_at
        ) VALUES (
            v_business_id,
            p_business_name,
            'commerce',
            'Autre',
            'A completer',
            'A completer',
            0,
            false,
            NOW(),
            NOW()
        );
        
        -- Step 2: Insert or update profile record
        INSERT INTO profiles (
            id,
            email,
            full_name,
            role,
            business_id,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_email,
            p_full_name,
            'user',
            NULL,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            updated_at = NOW();
        
        -- Step 3: Insert business claim record
        INSERT INTO business_claims (
            user_id,
            business_id,
            full_name,
            job_title,
            email,
            status,
            proof_methods,
            proof_status,
            proof_data,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            v_business_id,
            p_full_name,
            COALESCE(p_job_title, 'Non specifie'),
            p_email,
            'pending',
            '{}',
            '{}',
            '{}',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_claim_id;
        
        -- Success! Return the created IDs
        RETURN QUERY SELECT v_business_id, v_claim_id, true;
        
    EXCEPTION WHEN OTHERS THEN
        -- Any error in this block causes entire transaction to rollback
        RAISE EXCEPTION 'Pro signup failed: % %', SQLERRM, SQLSTATE;
        RETURN QUERY SELECT NULL::TEXT, NULL::UUID, false;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_pro_signup(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION create_pro_signup(UUID, TEXT, TEXT, TEXT, TEXT) IS 
'Atomically creates business, profile, and claim for pro signup. 
All operations succeed together or all rollback - no orphaned records.';

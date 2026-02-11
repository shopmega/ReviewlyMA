-- Atomic Proof Verification Stored Procedure
-- Updates proof_status using atomic JSON operations
-- No race conditions with concurrent verifications

CREATE OR REPLACE FUNCTION update_claim_proof_status(
    p_claim_id UUID,
    p_method TEXT,
    p_status TEXT
)
RETURNS TABLE(claim_id UUID, proof_status JSONB, success BOOLEAN) AS $$
BEGIN
    UPDATE business_claims
    SET proof_status = jsonb_set(
        COALESCE(proof_status, '{}'),
        ARRAY[p_method],
        to_jsonb(p_status::text)
    ),
    updated_at = NOW()
    WHERE id = p_claim_id
    RETURNING 
        business_claims.id,
        business_claims.proof_status,
        true as success;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update proof status: % %', SQLERRM, SQLSTATE;
    RETURN QUERY SELECT NULL::UUID, NULL::JSONB, false;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_claim_proof_status(UUID, TEXT, TEXT) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION update_claim_proof_status(UUID, TEXT, TEXT) IS 
'Atomically updates a single proof method status in a claim proof_status JSONB.
Prevents race conditions with concurrent verification attempts.
Multiple concurrent calls will all succeed without overwriting each other.';

-- Optional: Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_claim_method 
ON verification_codes(claim_id, method, verified);

CREATE INDEX IF NOT EXISTS idx_business_claims_proof_methods 
ON business_claims(id) INCLUDE (proof_status, proof_data);

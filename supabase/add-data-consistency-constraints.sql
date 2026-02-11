-- Data Consistency Constraints
-- Prevents orphaned and duplicate claim records
-- Date: January 9, 2026

-- ============================================================================
-- 1. UNIQUE CONSTRAINT: One claim per user-business combination
-- ============================================================================
-- Prevents duplicate claims where same user claims same business multiple times
-- Note: This enforces uniqueness for all user_id values (NULLs are also treated as unique)

-- Create unique constraint to prevent duplicate user-business claims
ALTER TABLE business_claims
ADD CONSTRAINT unique_user_business_claim 
UNIQUE(user_id, business_id);

-- ============================================================================
-- Summary of Constraints Added
-- ============================================================================
-- ✅ Unique constraint (user_id, business_id): Prevents user from claiming same business twice
-- ✅ Result: No duplicate claims

-- FIX ORPHANED PROFILE ISSUE
-- This fixes the profile without approved claim: zouhairbenseddik@gmail.com

-- First, let's examine the current state
SELECT 
    p.id,
    p.email,
    p.role,
    p.business_id,
    bc.id as claim_id,
    bc.status as claim_status,
    bc.business_id as claimed_business
FROM profiles p
LEFT JOIN business_claims bc ON p.id = bc.user_id
WHERE p.email = 'zouhairbenseddik@gmail.com';

-- OPTION 1: If there's a pending claim, approve it
-- Uncomment the following lines if you want to approve an existing claim:
/*
UPDATE business_claims 
SET status = 'approved',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'zouhairbenseddik@gmail.com')
AND status = 'pending';
*/

-- OPTION 2: Reset user to regular role (safer approach)
-- This removes the inconsistency by downgrading the user
UPDATE profiles 
SET role = 'user',
    business_id = NULL,
    is_premium = false,
    updated_at = NOW()
WHERE email = 'zouhairbenseddik@gmail.com';

-- Verify the fix
SELECT 
    id,
    email,
    role,
    business_id,
    is_premium
FROM profiles 
WHERE email = 'zouhairbenseddik@gmail.com';

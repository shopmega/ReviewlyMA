-- Fix Duplicate Claims Recovery Script
-- This script fixes the issue where users lost access to their first business
-- when a second claim was approved and overwrote their profiles.business_id

-- First, let's identify users with multiple approved claims
WITH duplicate_claims AS (
  SELECT 
    user_id,
    COUNT(*) as claim_count,
    ARRAY_AGG(business_id ORDER BY created_at ASC) as business_ids,
    ARRAY_AGG(created_at ORDER BY created_at ASC) as claim_dates,
    ARRAY_AGG(id ORDER BY created_at ASC) as claim_ids
  FROM business_claims 
  WHERE status = 'approved'
  GROUP BY user_id 
  HAVING COUNT(*) > 1
)
SELECT 
  dc.user_id,
  p.full_name,
  p.email,
  dc.claim_count,
  dc.business_ids,
  dc.claim_dates,
  dc.claim_ids,
  p.business_id as current_business_id
FROM duplicate_claims dc
JOIN profiles p ON dc.user_id = p.id
ORDER BY dc.claim_count DESC, p.full_name;

-- Fix the issue by restoring the first business for each user
-- This updates the user's profile to point back to their FIRST approved claim

UPDATE profiles 
SET business_id = first_claims.first_business_id
FROM (
  SELECT 
    user_id,
    MIN(business_id) as first_business_id, -- Get the first business_id
    MIN(created_at) as first_claim_date
  FROM business_claims 
  WHERE status = 'approved'
  GROUP BY user_id
  HAVING COUNT(*) > 1
) AS first_claims
WHERE profiles.id = first_claims.user_id
AND profiles.business_id != first_claims.first_business_id;

-- Verify the fix
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id,
  COUNT(bc.id) as total_approved_claims
FROM profiles p
LEFT JOIN business_claims bc ON p.id = bc.user_id AND bc.status = 'approved'
WHERE p.role = 'pro'
GROUP BY p.id, p.full_name, p.email, p.business_id
HAVING COUNT(bc.id) > 1
ORDER BY p.full_name;

-- For the specific case mentioned (Zouhair Benseddik)
-- Let's check his current status and fix if needed
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id as current_business,
  bc.id as claim_id,
  bc.business_id as claim_business,
  bc.status,
  bc.created_at,
  bc.reviewed_at
FROM profiles p
LEFT JOIN business_claims bc ON p.id = bc.user_id
WHERE p.id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
ORDER BY bc.created_at;

-- If needed, manually restore the first business (morocco-mall)
UPDATE profiles 
SET business_id = 'morocco-mall'
WHERE id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48'
AND business_id = 'la-mamounia'; -- Only fix if currently has la-mamounia

-- Add a comment to the second claim to mark it as secondary
UPDATE business_claims 
SET admin_notes = 'Secondary claim - user already manages morocco-mall. This claim was approved but user retains first business.'
WHERE id = 'cb155245-bed3-498f-990f-e4e989efe18d';

-- Final verification for the specific user
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.business_id as final_business,
  b.name as business_name
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.id = '8d103fdc-e2d1-4606-9a60-ad2744e89b48';

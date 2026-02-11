-- Fix RLS for review replies with claim fallback
-- Allows business owners to reply to reviews left for their establishment
-- Even if their profile hasn't synced yet, it checks the approved claim

DROP POLICY IF EXISTS "Business owners can reply to reviews" ON reviews;

CREATE POLICY "Business owners can reply to reviews" 
ON reviews 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = reviews.business_id
    AND profiles.role = 'pro'
  )
  OR
  EXISTS (
    SELECT 1 FROM business_claims
    WHERE business_claims.user_id = auth.uid()
    AND business_claims.business_id = reviews.business_id
    AND business_claims.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = reviews.business_id
    AND profiles.role = 'pro'
  )
  OR
  EXISTS (
    SELECT 1 FROM business_claims
    WHERE business_claims.user_id = auth.uid()
    AND business_claims.business_id = reviews.business_id
    AND business_claims.status = 'approved'
  )
);

-- Ensure owners can only update reply fields (optional, but good for security)
-- Note: Supabase doesn't natively support column-level RLS easily in a single policy, 
-- but we can use a trigger if we want strict column enforcement.
-- For now, this policy allows the owner to update the review record.

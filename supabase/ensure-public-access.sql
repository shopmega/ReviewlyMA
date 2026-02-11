-- Ensure public read access for businesses
-- This is critical for the dashboard and other parts of the app to function
DROP POLICY IF EXISTS "Public businesses are viewable by everyone" ON public.businesses;
CREATE POLICY "Public businesses are viewable by everyone" ON public.businesses
FOR SELECT USING (true);

-- Ensure profiles are viewable (needed for RLS checks in other tables)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

-- Re-verify review reply policy
DROP POLICY IF EXISTS "Business owners can reply to reviews" ON public.reviews;
CREATE POLICY "Business owners can reply to reviews" 
ON public.reviews 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = reviews.business_id
    AND profiles.role = 'pro'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = reviews.business_id
    AND profiles.role = 'pro'
  )
);

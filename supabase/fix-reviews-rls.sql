-- Fix Reviews RLS Policies
-- This adds the missing SELECT policies that allow admins to see all reviews
-- and the public to see only published reviews

-- 1. Allow admins to see all reviews (including pending and rejected)
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
CREATE POLICY "Admins can view all reviews" 
ON public.reviews 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 2. Allow public users to see only published reviews
DROP POLICY IF EXISTS "Public users can view published reviews" ON public.reviews;
CREATE POLICY "Public users can view published reviews" 
ON public.reviews 
FOR SELECT 
USING (status = 'published');

-- 3. Allow business owners to see all reviews for their business (including pending)
DROP POLICY IF EXISTS "Business owners can view their business reviews" ON public.reviews;
CREATE POLICY "Business owners can view their business reviews" 
ON public.reviews 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
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

-- 4. Allow users to see their own reviews (regardless of status)
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
TO authenticated
USING (reviews.user_id = auth.uid());

-- 5. Allow admins to update any review
DROP POLICY IF EXISTS "Admins can update any review" ON public.reviews;
CREATE POLICY "Admins can update any review" 
ON public.reviews 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 6. Allow admins to delete any review
DROP POLICY IF EXISTS "Admins can delete any review" ON public.reviews;
CREATE POLICY "Admins can delete any review" 
ON public.reviews 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 7. Allow users to update their own reviews (with status restrictions)
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
TO authenticated
USING (
  reviews.user_id = auth.uid()
)
WITH CHECK (
  reviews.user_id = auth.uid()
);

-- 8. Allow users to delete their own reviews
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
TO authenticated
USING (
  reviews.user_id = auth.uid()
);

-- 9. Allow authenticated users to insert reviews (existing submitReview action handles validation)
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews" 
ON public.reviews 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Enable RLS on reviews table (if not already enabled)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

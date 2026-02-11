-- 1. Add gallery_urls column to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}';

-- 2. Enable RLS on businesses table if not enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Owners can update their own business" ON public.businesses;

-- 4. Create policy for business owners to update their own business profile
CREATE POLICY "Owners can update their own business" ON public.businesses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.business_id = businesses.id
    AND profiles.role = 'pro'
  )
);

-- 5. Create policy for admins to update any business
DROP POLICY IF EXISTS "Admins can update any business" ON public.businesses;
CREATE POLICY "Admins can update any business" ON public.businesses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

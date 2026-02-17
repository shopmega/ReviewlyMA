-- Allow authenticated users to submit their own premium payment references
DROP POLICY IF EXISTS "Users can insert own pending payments" ON public.premium_payments;

CREATE POLICY "Users can insert own pending payments"
ON public.premium_payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

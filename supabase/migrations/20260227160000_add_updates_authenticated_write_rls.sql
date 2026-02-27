-- Fix RLS for updates so authenticated business managers can write announcements.

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated can insert managed updates" ON public.updates;
  DROP POLICY IF EXISTS "Authenticated can update managed updates" ON public.updates;
  DROP POLICY IF EXISTS "Authenticated can delete managed updates" ON public.updates;
END $$;

CREATE POLICY "Authenticated can insert managed updates"
  ON public.updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = updates.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_businesses ub
      WHERE ub.business_id = updates.business_id
        AND ub.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_claims bc
      WHERE bc.business_id = updates.business_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'approved'
    )
  );

CREATE POLICY "Authenticated can update managed updates"
  ON public.updates
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = updates.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_businesses ub
      WHERE ub.business_id = updates.business_id
        AND ub.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_claims bc
      WHERE bc.business_id = updates.business_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'approved'
    )
  )
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = updates.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_businesses ub
      WHERE ub.business_id = updates.business_id
        AND ub.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_claims bc
      WHERE bc.business_id = updates.business_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'approved'
    )
  );

CREATE POLICY "Authenticated can delete managed updates"
  ON public.updates
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = updates.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_businesses ub
      WHERE ub.business_id = updates.business_id
        AND ub.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_claims bc
      WHERE bc.business_id = updates.business_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'approved'
    )
  );

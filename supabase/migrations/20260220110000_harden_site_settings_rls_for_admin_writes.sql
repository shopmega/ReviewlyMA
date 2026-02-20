-- Harden site_settings RLS to avoid admin/service-role write failures.
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'site_settings'
        AND policyname = 'Service role can manage site settings'
    ) THEN
      CREATE POLICY "Service role can manage site settings"
        ON public.site_settings
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'site_settings'
        AND policyname = 'Admins can update settings with check'
    ) THEN
      CREATE POLICY "Admins can update settings with check"
        ON public.site_settings
        FOR UPDATE
        USING (public.is_admin_user(auth.uid()))
        WITH CHECK (public.is_admin_user(auth.uid()));
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

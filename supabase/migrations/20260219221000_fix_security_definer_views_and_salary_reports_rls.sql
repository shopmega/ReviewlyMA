-- Security hardening for linter findings:
-- 1) Remove SECURITY DEFINER behavior from exposed views.
-- 2) Enable RLS on public.salary_monthly_reports.

-- Ensure exposed views always run as SECURITY INVOKER (caller privileges + RLS).
ALTER VIEW IF EXISTS public.salary_city_sector_metrics
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.salary_role_city_metrics
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.salary_company_metrics
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.salary_city_metrics
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.salary_monthly_reports_public
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.search_logs
  SET (security_invoker = true);

-- Enforce RLS on monthly reports table (table is in public schema).
ALTER TABLE IF EXISTS public.salary_monthly_reports
  ENABLE ROW LEVEL SECURITY;

-- Service role policy for backend jobs / RPCs that need full access.
DO $$
BEGIN
  IF to_regclass('public.salary_monthly_reports') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'salary_monthly_reports'
        AND policyname = 'Public can read published salary monthly reports'
    ) THEN
      CREATE POLICY "Public can read published salary monthly reports"
        ON public.salary_monthly_reports
        FOR SELECT
        TO anon, authenticated
        USING (is_published = true);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'salary_monthly_reports'
        AND policyname = 'Service role can manage salary monthly reports'
    ) THEN
      CREATE POLICY "Service role can manage salary monthly reports"
        ON public.salary_monthly_reports
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

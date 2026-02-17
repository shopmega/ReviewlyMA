-- Salary phase 3: monthly reporting snapshots ("Barometre des salaires")

CREATE TABLE IF NOT EXISTS public.salary_monthly_reports (
  id BIGSERIAL PRIMARY KEY,
  report_month DATE NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  report_payload JSONB NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_salary_monthly_reports_published
  ON public.salary_monthly_reports(is_published, report_month DESC);

CREATE OR REPLACE FUNCTION public.generate_salary_monthly_report(
  p_report_month DATE DEFAULT date_trunc('month', timezone('utc'::text, now()))::date,
  p_publish BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_month DATE := date_trunc('month', p_report_month)::date;
  v_rows_company INT := 0;
  v_rows_city INT := 0;
  v_rows_city_sector INT := 0;
  v_rows_role_city INT := 0;
  v_payload JSONB;
BEGIN
  -- Keep source metrics fresh if function exists
  IF to_regprocedure('public.refresh_salary_analytics_materialized_views()') IS NOT NULL THEN
    PERFORM public.refresh_salary_analytics_materialized_views();
  END IF;

  IF to_regclass('public.salary_company_metrics') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rows_company FROM public.salary_company_metrics;
  END IF;

  IF to_regclass('public.salary_city_metrics') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rows_city FROM public.salary_city_metrics;
  END IF;

  IF to_regclass('public.salary_city_sector_metrics') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rows_city_sector FROM public.salary_city_sector_metrics;
  END IF;

  IF to_regclass('public.salary_role_city_metrics') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rows_role_city FROM public.salary_role_city_metrics;
  END IF;

  v_payload := jsonb_build_object(
    'report_month', v_report_month,
    'generated_at', timezone('utc'::text, now()),
    'source_rows', jsonb_build_object(
      'company', v_rows_company,
      'city', v_rows_city,
      'city_sector', v_rows_city_sector,
      'role_city', v_rows_role_city
    ),
    'highlights', jsonb_build_object(
      'top_companies', COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(t))
          FROM (
            SELECT
              business_id,
              business_name,
              city,
              sector_slug,
              submission_count,
              median_monthly_salary,
              pct_above_city_avg,
              pct_above_sector_avg
            FROM public.salary_company_metrics
            ORDER BY submission_count DESC, median_monthly_salary DESC NULLS LAST
            LIMIT 20
          ) t
        ),
        '[]'::jsonb
      ),
      'top_city_sector_pairs', COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(t))
          FROM (
            SELECT
              city,
              city_slug,
              sector_slug,
              submission_count,
              median_monthly_salary,
              junior_median_monthly_salary,
              senior_median_monthly_salary
            FROM public.salary_city_sector_metrics
            ORDER BY submission_count DESC, median_monthly_salary DESC NULLS LAST
            LIMIT 30
          ) t
        ),
        '[]'::jsonb
      ),
      'top_role_city_pairs', COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(t))
          FROM (
            SELECT
              job_title,
              city,
              city_slug,
              top_sector_slug,
              submission_count,
              median_monthly_salary,
              national_median_monthly_salary,
              pct_vs_national_role_median
            FROM public.salary_role_city_metrics
            ORDER BY submission_count DESC, median_monthly_salary DESC NULLS LAST
            LIMIT 40
          ) t
        ),
        '[]'::jsonb
      )
    )
  );

  INSERT INTO public.salary_monthly_reports (
    report_month,
    generated_at,
    generated_by,
    is_published,
    published_at,
    report_payload
  )
  VALUES (
    v_report_month,
    timezone('utc'::text, now()),
    auth.uid(),
    p_publish,
    CASE WHEN p_publish THEN timezone('utc'::text, now()) ELSE NULL END,
    v_payload
  )
  ON CONFLICT (report_month)
  DO UPDATE
  SET
    generated_at = EXCLUDED.generated_at,
    generated_by = EXCLUDED.generated_by,
    is_published = CASE
      WHEN EXCLUDED.is_published THEN true
      ELSE public.salary_monthly_reports.is_published
    END,
    published_at = CASE
      WHEN EXCLUDED.is_published THEN timezone('utc'::text, now())
      ELSE public.salary_monthly_reports.published_at
    END,
    report_payload = EXCLUDED.report_payload;

  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
      auth.uid(),
      'salary_monthly_report_generated',
      jsonb_build_object(
        'report_month', v_report_month,
        'published', p_publish,
        'source_rows', jsonb_build_object(
          'company', v_rows_company,
          'city', v_rows_city,
          'city_sector', v_rows_city_sector,
          'role_city', v_rows_role_city
        ),
        'ran_at', timezone('utc'::text, now())
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'report_month', v_report_month,
    'published', p_publish,
    'source_rows', jsonb_build_object(
      'company', v_rows_company,
      'city', v_rows_city,
      'city_sector', v_rows_city_sector,
      'role_city', v_rows_role_city
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_salary_monthly_report(DATE, BOOLEAN) TO service_role;

CREATE OR REPLACE VIEW public.salary_monthly_reports_public AS
SELECT
  report_month,
  generated_at,
  published_at,
  report_payload
FROM public.salary_monthly_reports
WHERE is_published = true
ORDER BY report_month DESC;

GRANT SELECT ON public.salary_monthly_reports_public TO anon, authenticated, service_role;
GRANT SELECT ON public.salary_monthly_reports TO service_role;

-- Optional monthly scheduler (1st day of month at 03:10 UTC) if pg_cron exists.
DO $$
DECLARE
  v_jobid INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      SELECT jobid INTO v_jobid
      FROM cron.job
      WHERE jobname = 'generate-salary-monthly-report'
      LIMIT 1;

      IF v_jobid IS NOT NULL THEN
        PERFORM cron.unschedule(v_jobid);
      END IF;

      PERFORM cron.schedule(
        'generate-salary-monthly-report',
        '10 3 1 * *',
        $job$SELECT public.generate_salary_monthly_report(date_trunc('month', timezone('utc'::text, now()))::date, false);$job$
      );
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_function THEN NULL;
    END;
  END IF;
END $$;

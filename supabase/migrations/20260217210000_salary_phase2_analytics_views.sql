-- Salary phase 2: analytics materialized views + refresh pipeline

DROP MATERIALIZED VIEW IF EXISTS public.salary_company_metrics_mv;
CREATE MATERIALIZED VIEW public.salary_company_metrics_mv AS
WITH published AS (
  SELECT
    s.id,
    s.business_id,
    b.name AS business_name,
    COALESCE(NULLIF(TRIM(b.city), ''), 'Non defini') AS city,
    COALESCE(public.salary_sector_slug(NULLIF(TRIM(b.city), '')), 'non-defini') AS city_slug,
    COALESCE(NULLIF(s.sector_slug, ''), public.salary_sector_slug(b.category), 'non-defini') AS sector_slug,
    s.job_title,
    s.seniority_level,
    s.salary_monthly_normalized AS salary_monthly
  FROM public.salaries s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.status = 'published'
    AND s.salary_monthly_normalized IS NOT NULL
    AND s.salary_monthly_normalized > 0
),
company_agg AS (
  SELECT
    business_id,
    MAX(business_name) AS business_name,
    MAX(city) AS city,
    MAX(city_slug) AS city_slug,
    MAX(sector_slug) AS sector_slug,
    COUNT(*)::int AS submission_count,
    ROUND(AVG(salary_monthly)::numeric, 2) AS avg_monthly_salary,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly)::numeric, 2) AS median_monthly_salary,
    ROUND(MIN(salary_monthly)::numeric, 2) AS min_monthly_salary,
    ROUND(MAX(salary_monthly)::numeric, 2) AS max_monthly_salary
  FROM published
  GROUP BY business_id
),
most_role AS (
  SELECT
    business_id,
    job_title,
    COUNT(*)::int AS role_submission_count,
    ROW_NUMBER() OVER (
      PARTITION BY business_id
      ORDER BY COUNT(*) DESC, job_title ASC
    ) AS rn
  FROM published
  GROUP BY business_id, job_title
),
city_avg AS (
  SELECT
    city_slug,
    ROUND(AVG(salary_monthly)::numeric, 2) AS city_avg_salary
  FROM published
  GROUP BY city_slug
),
sector_avg AS (
  SELECT
    sector_slug,
    ROUND(AVG(salary_monthly)::numeric, 2) AS sector_avg_salary
  FROM published
  GROUP BY sector_slug
)
SELECT
  ca.business_id,
  ca.business_name,
  ca.city,
  ca.city_slug,
  ca.sector_slug,
  ca.submission_count,
  ca.avg_monthly_salary,
  ca.median_monthly_salary,
  ca.min_monthly_salary,
  ca.max_monthly_salary,
  mr.job_title AS most_reported_job_title,
  mr.role_submission_count AS most_reported_job_title_count,
  cavg.city_avg_salary,
  savg.sector_avg_salary,
  CASE
    WHEN cavg.city_avg_salary IS NULL OR cavg.city_avg_salary = 0 THEN NULL
    ELSE ROUND(((ca.avg_monthly_salary - cavg.city_avg_salary) / cavg.city_avg_salary) * 100, 2)
  END AS pct_above_city_avg,
  CASE
    WHEN savg.sector_avg_salary IS NULL OR savg.sector_avg_salary = 0 THEN NULL
    ELSE ROUND(((ca.avg_monthly_salary - savg.sector_avg_salary) / savg.sector_avg_salary) * 100, 2)
  END AS pct_above_sector_avg,
  timezone('utc'::text, now()) AS refreshed_at
FROM company_agg ca
LEFT JOIN most_role mr ON mr.business_id = ca.business_id AND mr.rn = 1
LEFT JOIN city_avg cavg ON cavg.city_slug = ca.city_slug
LEFT JOIN sector_avg savg ON savg.sector_slug = ca.sector_slug;

DROP MATERIALIZED VIEW IF EXISTS public.salary_city_sector_metrics_mv;
CREATE MATERIALIZED VIEW public.salary_city_sector_metrics_mv AS
WITH published AS (
  SELECT
    s.id,
    s.business_id,
    COALESCE(NULLIF(TRIM(b.city), ''), 'Non defini') AS city,
    COALESCE(public.salary_sector_slug(NULLIF(TRIM(b.city), '')), 'non-defini') AS city_slug,
    COALESCE(NULLIF(s.sector_slug, ''), public.salary_sector_slug(b.category), 'non-defini') AS sector_slug,
    s.seniority_level,
    s.salary_monthly_normalized AS salary_monthly
  FROM public.salaries s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.status = 'published'
    AND s.salary_monthly_normalized IS NOT NULL
    AND s.salary_monthly_normalized > 0
)
SELECT
  city,
  city_slug,
  sector_slug,
  COUNT(*)::int AS submission_count,
  COUNT(DISTINCT business_id)::int AS business_count,
  ROUND(AVG(salary_monthly)::numeric, 2) AS avg_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly)::numeric, 2) AS median_monthly_salary,
  ROUND(MIN(salary_monthly)::numeric, 2) AS min_monthly_salary,
  ROUND(MAX(salary_monthly)::numeric, 2) AS max_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level = 'junior')::numeric, 2) AS junior_median_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level IN ('senior', 'expert', 'manager'))::numeric, 2) AS senior_median_monthly_salary,
  timezone('utc'::text, now()) AS refreshed_at
FROM published
GROUP BY city, city_slug, sector_slug;

DROP MATERIALIZED VIEW IF EXISTS public.salary_city_metrics_mv;
CREATE MATERIALIZED VIEW public.salary_city_metrics_mv AS
WITH published AS (
  SELECT
    s.id,
    COALESCE(NULLIF(TRIM(b.city), ''), 'Non defini') AS city,
    COALESCE(public.salary_sector_slug(NULLIF(TRIM(b.city), '')), 'non-defini') AS city_slug,
    s.seniority_level,
    s.salary_monthly_normalized AS salary_monthly
  FROM public.salaries s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.status = 'published'
    AND s.salary_monthly_normalized IS NOT NULL
    AND s.salary_monthly_normalized > 0
)
SELECT
  city,
  city_slug,
  COUNT(*)::int AS submission_count,
  ROUND(AVG(salary_monthly)::numeric, 2) AS avg_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly)::numeric, 2) AS median_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level = 'junior')::numeric, 2) AS junior_median_monthly_salary,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level IN ('senior', 'expert', 'manager'))::numeric, 2) AS senior_median_monthly_salary,
  timezone('utc'::text, now()) AS refreshed_at
FROM published
GROUP BY city, city_slug;

DROP MATERIALIZED VIEW IF EXISTS public.salary_role_city_metrics_mv;
CREATE MATERIALIZED VIEW public.salary_role_city_metrics_mv AS
WITH published AS (
  SELECT
    s.id,
    s.job_title,
    COALESCE(NULLIF(TRIM(b.city), ''), 'Non defini') AS city,
    COALESCE(public.salary_sector_slug(NULLIF(TRIM(b.city), '')), 'non-defini') AS city_slug,
    COALESCE(NULLIF(s.sector_slug, ''), public.salary_sector_slug(b.category), 'non-defini') AS sector_slug,
    s.seniority_level,
    s.salary_monthly_normalized AS salary_monthly
  FROM public.salaries s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.status = 'published'
    AND s.salary_monthly_normalized IS NOT NULL
    AND s.salary_monthly_normalized > 0
),
role_city AS (
  SELECT
    job_title,
    city,
    city_slug,
    COUNT(*)::int AS submission_count,
    ROUND(AVG(salary_monthly)::numeric, 2) AS avg_monthly_salary,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly)::numeric, 2) AS median_monthly_salary,
    ROUND(MIN(salary_monthly)::numeric, 2) AS min_monthly_salary,
    ROUND(MAX(salary_monthly)::numeric, 2) AS max_monthly_salary,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level = 'junior')::numeric, 2) AS junior_median_monthly_salary,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly) FILTER (WHERE seniority_level IN ('senior', 'expert', 'manager'))::numeric, 2) AS senior_median_monthly_salary
  FROM published
  GROUP BY job_title, city, city_slug
),
role_national AS (
  SELECT
    job_title,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_monthly)::numeric, 2) AS national_median_monthly_salary
  FROM published
  GROUP BY job_title
),
top_sector AS (
  SELECT
    job_title,
    city_slug,
    sector_slug,
    COUNT(*)::int AS sector_count,
    ROW_NUMBER() OVER (
      PARTITION BY job_title, city_slug
      ORDER BY COUNT(*) DESC, sector_slug ASC
    ) AS rn
  FROM published
  GROUP BY job_title, city_slug, sector_slug
)
SELECT
  rc.job_title,
  rc.city,
  rc.city_slug,
  ts.sector_slug AS top_sector_slug,
  rc.submission_count,
  rc.avg_monthly_salary,
  rc.median_monthly_salary,
  rc.min_monthly_salary,
  rc.max_monthly_salary,
  rc.junior_median_monthly_salary,
  rc.senior_median_monthly_salary,
  rn.national_median_monthly_salary,
  CASE
    WHEN rn.national_median_monthly_salary IS NULL OR rn.national_median_monthly_salary = 0 THEN NULL
    ELSE ROUND(((rc.median_monthly_salary - rn.national_median_monthly_salary) / rn.national_median_monthly_salary) * 100, 2)
  END AS pct_vs_national_role_median,
  timezone('utc'::text, now()) AS refreshed_at
FROM role_city rc
LEFT JOIN role_national rn ON rn.job_title = rc.job_title
LEFT JOIN top_sector ts ON ts.job_title = rc.job_title AND ts.city_slug = rc.city_slug AND ts.rn = 1;

-- Query performance indexes on materialized views
CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_company_metrics_mv_business_id
ON public.salary_company_metrics_mv(business_id);
CREATE INDEX IF NOT EXISTS idx_salary_company_metrics_mv_city_slug
ON public.salary_company_metrics_mv(city_slug);
CREATE INDEX IF NOT EXISTS idx_salary_company_metrics_mv_sector_slug
ON public.salary_company_metrics_mv(sector_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_city_sector_metrics_mv_key
ON public.salary_city_sector_metrics_mv(city_slug, sector_slug);
CREATE INDEX IF NOT EXISTS idx_salary_city_sector_metrics_mv_city_slug
ON public.salary_city_sector_metrics_mv(city_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_city_metrics_mv_city_slug
ON public.salary_city_metrics_mv(city_slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_role_city_metrics_mv_key
ON public.salary_role_city_metrics_mv(job_title, city_slug);
CREATE INDEX IF NOT EXISTS idx_salary_role_city_metrics_mv_city_slug
ON public.salary_role_city_metrics_mv(city_slug);

-- Stable read views for app/API use
CREATE OR REPLACE VIEW public.salary_company_metrics AS
SELECT * FROM public.salary_company_metrics_mv;

CREATE OR REPLACE VIEW public.salary_city_sector_metrics AS
SELECT * FROM public.salary_city_sector_metrics_mv;

CREATE OR REPLACE VIEW public.salary_city_metrics AS
SELECT * FROM public.salary_city_metrics_mv;

CREATE OR REPLACE VIEW public.salary_role_city_metrics AS
SELECT * FROM public.salary_role_city_metrics_mv;

GRANT SELECT ON public.salary_company_metrics TO anon, authenticated, service_role;
GRANT SELECT ON public.salary_city_sector_metrics TO anon, authenticated, service_role;
GRANT SELECT ON public.salary_city_metrics TO anon, authenticated, service_role;
GRANT SELECT ON public.salary_role_city_metrics TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_salary_analytics_materialized_views()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_rows INT := 0;
  v_city_sector_rows INT := 0;
  v_city_rows INT := 0;
  v_role_city_rows INT := 0;
BEGIN
  IF to_regclass('public.salary_company_metrics_mv') IS NOT NULL THEN
    REFRESH MATERIALIZED VIEW public.salary_company_metrics_mv;
    SELECT COUNT(*) INTO v_company_rows FROM public.salary_company_metrics_mv;
  END IF;

  IF to_regclass('public.salary_city_sector_metrics_mv') IS NOT NULL THEN
    REFRESH MATERIALIZED VIEW public.salary_city_sector_metrics_mv;
    SELECT COUNT(*) INTO v_city_sector_rows FROM public.salary_city_sector_metrics_mv;
  END IF;

  IF to_regclass('public.salary_city_metrics_mv') IS NOT NULL THEN
    REFRESH MATERIALIZED VIEW public.salary_city_metrics_mv;
    SELECT COUNT(*) INTO v_city_rows FROM public.salary_city_metrics_mv;
  END IF;

  IF to_regclass('public.salary_role_city_metrics_mv') IS NOT NULL THEN
    REFRESH MATERIALIZED VIEW public.salary_role_city_metrics_mv;
    SELECT COUNT(*) INTO v_role_city_rows FROM public.salary_role_city_metrics_mv;
  END IF;

  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (admin_id, action, details)
    VALUES (
      NULL,
      'salary_analytics_refresh_job',
      jsonb_build_object(
        'company_rows', v_company_rows,
        'city_sector_rows', v_city_sector_rows,
        'city_rows', v_city_rows,
        'role_city_rows', v_role_city_rows,
        'ran_at', timezone('utc'::text, now())
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'company_rows', v_company_rows,
    'city_sector_rows', v_city_sector_rows,
    'city_rows', v_city_rows,
    'role_city_rows', v_role_city_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_salary_analytics_materialized_views() TO service_role;

-- Initial refresh
DO $$
BEGIN
  IF to_regclass('public.salary_company_metrics_mv') IS NOT NULL
     AND to_regclass('public.salary_city_sector_metrics_mv') IS NOT NULL
     AND to_regclass('public.salary_city_metrics_mv') IS NOT NULL
     AND to_regclass('public.salary_role_city_metrics_mv') IS NOT NULL THEN
    PERFORM public.refresh_salary_analytics_materialized_views();
  END IF;
END $$;

-- Optional DB scheduler if pg_cron exists
DO $$
DECLARE
  v_jobid INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      SELECT jobid INTO v_jobid
      FROM cron.job
      WHERE jobname = 'refresh-salary-analytics-daily'
      LIMIT 1;

      IF v_jobid IS NOT NULL THEN
        PERFORM cron.unschedule(v_jobid);
      END IF;

      PERFORM cron.schedule(
        'refresh-salary-analytics-daily',
        '40 2 * * *',
        $job$SELECT public.refresh_salary_analytics_materialized_views();$job$
      );
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_function THEN NULL;
    END;
  END IF;
END $$;

-- Performance optimizations: competitor ads + salary analytics read paths

-- Businesses owner lookups are hot in RLS checks and ownership-scoped queries.
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id
  ON public.businesses(owner_id);

-- Competitor ads read patterns (owner dashboard + business page targeting).
CREATE INDEX IF NOT EXISTS idx_competitor_ads_advertiser_business_id
  ON public.competitor_ads(advertiser_business_id);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_status_window
  ON public.competitor_ads(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_created_at
  ON public.competitor_ads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_target_competitor_ids_gin
  ON public.competitor_ads USING GIN(target_competitor_ids);

-- Aggregation-friendly index for ad event metrics by ad and event kind.
CREATE INDEX IF NOT EXISTS idx_competitor_ad_events_ad_id_event_type
  ON public.competitor_ad_events(ad_id, event_type);

-- Speeds salary analytics source scans for published/normalized rows.
CREATE INDEX IF NOT EXISTS idx_salaries_published_mv_feed
  ON public.salaries(business_id, salary_monthly_normalized)
  WHERE status = 'published'
    AND salary_monthly_normalized IS NOT NULL
    AND salary_monthly_normalized > 0;

-- Speeds top-N listing endpoints and monthly snapshot ordering.
CREATE INDEX IF NOT EXISTS idx_salary_company_metrics_mv_submission_desc
  ON public.salary_company_metrics_mv(submission_count DESC, median_monthly_salary DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_salary_city_sector_metrics_mv_submission_desc
  ON public.salary_city_sector_metrics_mv(submission_count DESC, median_monthly_salary DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_salary_role_city_metrics_mv_submission_desc
  ON public.salary_role_city_metrics_mv(submission_count DESC, median_monthly_salary DESC NULLS LAST);

-- Server-side metrics aggregation to avoid pulling raw event rows into app memory.
CREATE OR REPLACE FUNCTION public.get_my_competitor_ad_metrics()
RETURNS TABLE (
  ad_id UUID,
  impressions BIGINT,
  clicks BIGINT
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ca.id AS ad_id,
    COALESCE(COUNT(cae.id) FILTER (WHERE cae.event_type = 'impression'), 0)::BIGINT AS impressions,
    COALESCE(COUNT(cae.id) FILTER (WHERE cae.event_type = 'click'), 0)::BIGINT AS clicks
  FROM public.competitor_ads ca
  JOIN public.businesses b ON b.id = ca.advertiser_business_id
  LEFT JOIN public.competitor_ad_events cae ON cae.ad_id = ca.id
  WHERE b.owner_id = auth.uid()
  GROUP BY ca.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_competitor_ad_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_competitor_ad_metrics() TO service_role;

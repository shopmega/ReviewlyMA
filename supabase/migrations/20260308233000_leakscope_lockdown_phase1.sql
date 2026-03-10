-- Leakscope Phase 1 containment
-- Date: 2026-03-08
-- Purpose:
-- 1) Block anonymous write access on relations flagged by leakscope.
-- 2) Ensure RLS is enabled/forced on physical tables in the flagged set.
-- 3) Revoke anonymous EXECUTE on exposed RPC endpoints.

DO $$
DECLARE
  v_relation text;
BEGIN
  FOREACH v_relation IN ARRAY ARRAY[
    'admin_audit_log',
    'admin_business_opportunity_v1',
    'ads',
    'amenities',
    'analytics_events',
    'audit_logs',
    'blog_articles',
    'business_analytics',
    'business_claim_events',
    'business_claims',
    'business_hours',
    'business_outreach_pipeline',
    'business_reports',
    'business_suggestions',
    'businesses',
    'carousel_analytics',
    'categories',
    'claim_verification_evidence',
    'competitor_ad_events',
    'competitor_ads',
    'error_reports',
    'favorites',
    'interviews',
    'job_referral_demand_listings',
    'job_referral_offer_reports',
    'job_referral_offers',
    'job_referral_requests',
    'job_referral_user_blocks',
    'media_reports',
    'messages',
    'notifications',
    'pinned_content',
    'premium_payments',
    'premium_users',
    'profiles',
    'review_appeals',
    'review_moderation_events',
    'review_reports',
    'review_versions',
    'review_votes',
    'reviews',
    'salaries',
    'salary_alert_subscriptions',
    'salary_city_metrics',
    'salary_city_metrics_mv',
    'salary_city_sector_metrics',
    'salary_city_sector_metrics_mv',
    'salary_company_metrics',
    'salary_company_metrics_mv',
    'salary_monthly_reports',
    'salary_monthly_reports_public',
    'salary_role_city_metrics',
    'salary_role_city_metrics_mv',
    'saved_businesses',
    'search_analytics',
    'search_logs',
    'seasonal_collections',
    'site_settings',
    'subcategories',
    'support_ticket_messages',
    'support_tickets',
    'updates',
    'user_businesses',
    'verification_codes'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_relation)) IS NOT NULL THEN
      -- Phase 1 containment: anonymous users must not be able to mutate data.
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon',
        v_relation
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'admin_audit_log',
    'ads',
    'amenities',
    'analytics_events',
    'audit_logs',
    'blog_articles',
    'business_analytics',
    'business_claim_events',
    'business_claims',
    'business_hours',
    'business_outreach_pipeline',
    'business_reports',
    'business_suggestions',
    'businesses',
    'carousel_analytics',
    'categories',
    'claim_verification_evidence',
    'competitor_ad_events',
    'competitor_ads',
    'error_reports',
    'favorites',
    'interviews',
    'job_referral_demand_listings',
    'job_referral_offer_reports',
    'job_referral_offers',
    'job_referral_requests',
    'job_referral_user_blocks',
    'media_reports',
    'messages',
    'notifications',
    'pinned_content',
    'premium_payments',
    'premium_users',
    'profiles',
    'review_appeals',
    'review_moderation_events',
    'review_reports',
    'review_versions',
    'review_votes',
    'reviews',
    'salaries',
    'salary_alert_subscriptions',
    'salary_city_metrics',
    'salary_city_sector_metrics',
    'salary_company_metrics',
    'salary_monthly_reports',
    'salary_monthly_reports_public',
    'salary_role_city_metrics',
    'saved_businesses',
    'search_analytics',
    'search_logs',
    'seasonal_collections',
    'site_settings',
    'subcategories',
    'support_ticket_messages',
    'support_tickets',
    'updates',
    'user_businesses',
    'verification_codes'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table
        AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);
    END IF;
  END LOOP;
END $$;

-- Lock down anonymous RPC execution for endpoints flagged by leakscope.
DO $$
DECLARE
  v_fn record;
BEGIN
  FOR v_fn IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_my_competitor_ad_metrics',
        'rls_auto_enable',
        'refresh_salary_analytics_materialized_views',
        'expire_premium_accounts',
        'sync_all_business_ratings',
        'get_my_referral_offer_requests',
        'generate_salary_monthly_report'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
      v_fn.proname,
      v_fn.args
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

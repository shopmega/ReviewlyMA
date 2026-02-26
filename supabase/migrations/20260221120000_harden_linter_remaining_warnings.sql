-- Harden remaining DB linter warnings (excluding leaked password protection, per team decision).
-- - Move pg_trgm extension out of public schema when possible
-- - Remove anon/authenticated API access to salary materialized views
-- - Tighten permissive INSERT RLS policies that used WITH CHECK (true)

-- 1) Extension in public: move pg_trgm to extensions schema when relocatable.
create schema if not exists extensions;

do $$
declare
  v_schema text;
begin
  select n.nspname
  into v_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if v_schema = 'public' then
    begin
      alter extension pg_trgm set schema extensions;
    exception
      when others then
        raise notice 'Could not move extension pg_trgm out of public: %', sqlerrm;
    end;
  end if;
end
$$;

-- 2) Materialized views in API: block direct Data API access for anon/authenticated.
revoke all on table public.salary_company_metrics_mv from anon, authenticated;
revoke all on table public.salary_city_sector_metrics_mv from anon, authenticated;
revoke all on table public.salary_city_metrics_mv from anon, authenticated;
revoke all on table public.salary_role_city_metrics_mv from anon, authenticated;

-- Keep service-role access for internal jobs/admin tooling.
grant select on table public.salary_company_metrics_mv to service_role;
grant select on table public.salary_city_sector_metrics_mv to service_role;
grant select on table public.salary_city_metrics_mv to service_role;
grant select on table public.salary_role_city_metrics_mv to service_role;

-- 3) Replace overly permissive analytics/event insert policies.

-- analytics_events
drop policy if exists "Public can insert analytics events" on public.analytics_events;
create policy "Public can insert analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(event), '') is not null
    and char_length(event) <= 120
    and nullif(btrim(session_id), '') is not null
    and char_length(session_id) <= 128
    and (user_id is null or user_id = auth.uid())
    and timestamp >= (now() - interval '1 day')
    and timestamp <= (now() + interval '5 minutes')
    and jsonb_typeof(properties) = 'object'
    and jsonb_typeof(metadata) = 'object'
  );

-- search_analytics
drop policy if exists "Public can insert search analytics" on public.search_analytics;
create policy "Public can insert search analytics"
  on public.search_analytics
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(query), '') is not null
    and char_length(query) <= 200
    and results_count >= 0
    and results_count <= 10000
    and (user_id is null or user_id = auth.uid())
    and (session_id is null or char_length(session_id) <= 128)
    and created_at >= (now() - interval '1 day')
    and created_at <= (now() + interval '5 minutes')
  );

-- business_analytics
drop policy if exists "Public can insert business analytics" on public.business_analytics;
create policy "Public can insert business analytics"
  on public.business_analytics
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(business_id), '') is not null
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
    )
    and nullif(btrim(event_type), '') is not null
    and char_length(event_type) <= 64
    and created_at >= (now() - interval '1 day')
    and created_at <= (now() + interval '5 minutes')
  );

-- carousel_analytics
drop policy if exists "Public can insert carousel analytics" on public.carousel_analytics;
create policy "Public can insert carousel analytics"
  on public.carousel_analytics
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(session_id), '') is not null
    and char_length(session_id) <= 128
    and (user_id is null or user_id = auth.uid())
    and timestamp >= (now() - interval '1 day')
    and timestamp <= (now() + interval '5 minutes')
    and jsonb_typeof(metadata) = 'object'
  );

-- error_reports
drop policy if exists "Public can insert error reports" on public.error_reports;
create policy "Public can insert error reports"
  on public.error_reports
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(id), '') is not null
    and char_length(id) <= 128
    and nullif(btrim(message), '') is not null
    and char_length(message) <= 4000
    and nullif(btrim(type), '') is not null
    and char_length(type) <= 120
    and nullif(btrim(url), '') is not null
    and char_length(url) <= 2048
    and nullif(btrim(session_id), '') is not null
    and char_length(session_id) <= 128
    and (user_id is null or user_id = auth.uid())
    and timestamp >= (now() - interval '1 day')
    and timestamp <= (now() + interval '5 minutes')
    and jsonb_typeof(context) = 'object'
    and nullif(btrim(severity), '') is not null
    and char_length(severity) <= 32
  );

-- competitor_ad_events
drop policy if exists "Public can insert competitor ad events" on public.competitor_ad_events;
create policy "Public can insert competitor ad events"
  on public.competitor_ad_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.competitor_ads ca
      where ca.id = ad_id
        and ca.advertiser_business_id = advertiser_business_id
    )
    and exists (
      select 1
      from public.businesses b
      where b.id = target_business_id
    )
    and (user_id is null or user_id = auth.uid())
    and (viewer_session_id is null or char_length(viewer_session_id) <= 128)
    and created_at >= (now() - interval '1 day')
    and created_at <= (now() + interval '5 minutes')
    and jsonb_typeof(metadata) = 'object'
  );

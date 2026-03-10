-- Audit fixes and feature additions for Referral and Salary modules.
-- Part 1: RLS Hardening for Referral Demands
-- Part 2: Matching Engine (Triggers for Automated Notifications)
-- Part 3: Career Path Matrix Analytics

-- 1. RLS Hardening for job_referral_demand_listings and responses
-- Re-harden listings to ensure only eligible users (review/salary published) can create them.
drop policy if exists "Users can insert own referral demand listings" on public.job_referral_demand_listings;
create policy "Users can insert own referral demand listings if eligible"
on public.job_referral_demand_listings for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.can_user_publish_referral_offer(auth.uid()) e
    where e.is_eligible = true
  )
);

drop policy if exists "Users can update own referral demand listings" on public.job_referral_demand_listings;
create policy "Users can update own referral demand listings if eligible"
on public.job_referral_demand_listings for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.can_user_publish_referral_offer(auth.uid()) e
    where e.is_eligible = true
  )
);

-- Also harden demand responses (responders should also be contributors to avoid spam)
drop policy if exists "Users can create demand responses" on public.job_referral_demand_responses;
create policy "Users can create demand responses if eligible"
on public.job_referral_demand_responses for insert
to authenticated
with check (
  auth.uid() = responder_user_id
  and status = 'active'
  and exists (
    select 1
    from public.can_user_publish_referral_offer(auth.uid()) e
    where e.is_eligible = true
  )
  and exists (
    select 1
    from public.job_referral_demand_listings d
    where d.id = demand_listing_id
      and d.user_id <> auth.uid()
      and d.status = 'active'
      and (d.expires_at is null or d.expires_at > timezone('utc'::text, now()))
  )
);

-- 2. Matching Engine Triggers
-- Function to notify offer owners when a matching demand is published.
create or replace function public.fn_notify_matching_referral_demand()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer record;
begin
  -- Find active offers that match the new demand's role and city
  for v_offer in (
    select o.id, o.user_id, o.company_name, o.job_title
    from public.job_referral_offers o
    where o.status = 'active'
      and o.user_id <> new.user_id -- Don't notify the person who posted the demand if they also have an offer
      and (
        -- Simple partial match on job title or target role
        lower(o.job_title) like '%' || lower(new.target_role) || '%'
        or lower(new.target_role) like '%' || lower(o.job_title) || '%'
      )
      and (o.city is null or new.city is null or lower(o.city) = lower(new.city))
  ) loop
    insert into public.notifications (user_id, title, message, type, link)
    values (
      v_offer.user_id,
      'Nouveau candidat correspondant',
      'Une nouvelle demande de parrainage pour ' || new.target_role || ' a été publiée. Elle pourrait correspondre à votre offre chez ' || v_offer.company_name || '.',
      'referral_match',
      '/parrainages/demandes/' || new.id
    );
  end loop;
  
  return new;
end;
$$;

drop trigger if exists trg_notify_matching_referral_demand on public.job_referral_demand_listings;
create trigger trg_notify_matching_referral_demand
after insert on public.job_referral_demand_listings
for each row execute function public.fn_notify_matching_referral_demand();

-- Function to notify demand owners when a matching offer is published.
create or replace function public.fn_notify_matching_referral_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demand record;
begin
  -- Find active demands that match the new offer's role and city
  for v_demand in (
    select d.id, d.user_id, d.title, d.target_role
    from public.job_referral_demand_listings d
    where d.status = 'active'
      and d.user_id <> new.user_id
      and (
        lower(d.target_role) like '%' || lower(new.job_title) || '%'
        or lower(new.job_title) like '%' || lower(d.target_role) || '%'
      )
      and (d.city is null or new.city is null or lower(d.city) = lower(new.city))
  ) loop
    insert into public.notifications (user_id, title, message, type, link)
    values (
      v_demand.user_id,
      'Nouvelle offre de parrainage',
      'Un employé chez ' || new.company_name || ' propose un parrainage pour ' || new.job_title || '. Cela correspond à votre demande.',
      'referral_match',
      '/parrainages/' || new.id
    );
  end loop;
  
  return new;
end;
$$;

drop trigger if exists trg_notify_matching_referral_offer on public.job_referral_offers;
create trigger trg_notify_matching_referral_offer
after insert on public.job_referral_offers
for each row execute function public.fn_notify_matching_referral_offer();

-- 3. Career Path Matrix Analytics
drop materialized view if exists public.salary_career_path_metrics_mv;
create materialized view public.salary_career_path_metrics_mv as
with base as (
  select
    job_title,
    seniority_level,
    salary_monthly_normalized as salary,
    years_experience
  from public.salaries
  where status = 'published'
    and salary_monthly_normalized > 0
)
select
  job_title,
  seniority_level,
  count(*)::int as submission_count,
  round(percentile_cont(0.5) within group (order by salary)::numeric, 2) as median_salary,
  round(avg(salary)::numeric, 2) as avg_salary,
  round(avg(years_experience)::numeric, 1) as avg_years_experience
from base
group by job_title, seniority_level;

create index idx_salary_career_path_job on public.salary_career_path_metrics_mv(job_title);

grant select on public.salary_career_path_metrics_mv to anon, authenticated, service_role;

-- Update refresh function to include the new career path view
create or replace function public.refresh_salary_analytics_materialized_views()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_rows int := 0;
  v_city_sector_rows int := 0;
  v_city_rows int := 0;
  v_role_city_rows int := 0;
  v_career_rows int := 0;
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

  IF to_regclass('public.salary_career_path_metrics_mv') IS NOT NULL THEN
    REFRESH MATERIALIZED VIEW public.salary_career_path_metrics_mv;
    SELECT COUNT(*) INTO v_career_rows FROM public.salary_career_path_metrics_mv;
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
        'career_rows', v_career_rows,
        'ran_at', timezone('utc'::text, now())
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'company_rows', v_company_rows,
    'city_sector_rows', v_city_sector_rows,
    'city_rows', v_city_rows,
    'role_city_rows', v_role_city_rows,
    'career_rows', v_career_rows
  );
END;
$$;

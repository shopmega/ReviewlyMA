create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text references public.businesses(id) on delete set null,
  company_name text not null,
  job_title text not null,
  job_title_normalized text,
  city text,
  city_slug text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text not null default 'MAD',
  pay_period text not null check (pay_period in ('monthly', 'yearly')),
  contract_type text check (contract_type in ('cdi', 'cdd', 'freelance', 'internship', 'temporary', 'other')),
  work_model text check (work_model in ('onsite', 'hybrid', 'remote')),
  seniority_level text check (seniority_level in ('junior', 'mid', 'senior', 'lead', 'manager', 'executive')),
  years_experience_required numeric,
  benefits jsonb not null default '[]'::jsonb,
  source_text text,
  source_type text not null default 'manual' check (source_type in ('manual', 'paste', 'url', 'document')),
  source_url text,
  document_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'flagged')),
  visibility text not null default 'private' check (visibility in ('private', 'aggregate_only', 'public')),
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_offers_user_id on public.job_offers(user_id);
create index if not exists idx_job_offers_business_id on public.job_offers(business_id);
create index if not exists idx_job_offers_city_slug on public.job_offers(city_slug);
create index if not exists idx_job_offers_job_title_normalized on public.job_offers(job_title_normalized);
create index if not exists idx_job_offers_status on public.job_offers(status);

drop trigger if exists trg_job_offers_updated_at on public.job_offers;
create trigger trg_job_offers_updated_at
before update on public.job_offers
for each row execute function public.update_updated_at_column();

create table if not exists public.job_offer_analyses (
  id uuid primary key default gen_random_uuid(),
  job_offer_id uuid not null references public.job_offers(id) on delete cascade,
  analysis_version text not null,
  overall_offer_score numeric not null,
  compensation_score numeric not null,
  market_alignment_score numeric not null,
  transparency_score numeric not null,
  quality_score numeric not null,
  market_position_label text not null,
  confidence_level text not null check (confidence_level in ('low', 'medium', 'high')),
  benchmark_role_city_median numeric,
  benchmark_company_median numeric,
  benchmark_city_median numeric,
  benchmark_primary_source text,
  risk_flags jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  analysis_summary text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_offer_analyses_job_offer_id on public.job_offer_analyses(job_offer_id);
create index if not exists idx_job_offer_analyses_score on public.job_offer_analyses(overall_offer_score desc);

create table if not exists public.job_offer_moderation_events (
  id uuid primary key default gen_random_uuid(),
  job_offer_id uuid not null references public.job_offers(id) on delete cascade,
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_offer_moderation_events_offer on public.job_offer_moderation_events(job_offer_id);

alter table public.job_offers enable row level security;
alter table public.job_offer_analyses enable row level security;
alter table public.job_offer_moderation_events enable row level security;

do $$ begin
  create policy "Users can create own job offers"
    on public.job_offers for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can read own job offers"
    on public.job_offers for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage all job offers"
    on public.job_offers for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can read own job offer analyses"
    on public.job_offer_analyses for select
    using (
      exists (
        select 1
        from public.job_offers jo
        where jo.id = job_offer_id
          and jo.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create analyses for own job offers"
    on public.job_offer_analyses for insert
    with check (
      exists (
        select 1
        from public.job_offers jo
        where jo.id = job_offer_id
          and jo.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage all job offer analyses"
    on public.job_offer_analyses for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage moderation events"
    on public.job_offer_moderation_events for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage job offers"
    on public.job_offers for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage job offer analyses"
    on public.job_offer_analyses for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage moderation events"
    on public.job_offer_moderation_events for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace view public.job_offer_company_metrics as
select
  jo.business_id,
  max(jo.company_name) as business_name,
  max(jo.city_slug) as city_slug,
  count(*)::int as approved_offer_count,
  avg(
    case
      when jo.salary_min is not null and jo.salary_max is not null and jo.pay_period = 'yearly'
        then ((jo.salary_min + jo.salary_max) / 2.0) / 12.0
      when jo.salary_min is not null and jo.salary_max is not null
        then (jo.salary_min + jo.salary_max) / 2.0
      when jo.salary_min is not null and jo.pay_period = 'yearly'
        then jo.salary_min / 12.0
      when jo.salary_max is not null and jo.pay_period = 'yearly'
        then jo.salary_max / 12.0
      else coalesce(jo.salary_min, jo.salary_max)
    end
  )::numeric(12,2) as avg_offer_monthly,
  percentile_cont(0.5) within group (
    order by
      case
        when jo.salary_min is not null and jo.salary_max is not null and jo.pay_period = 'yearly'
          then ((jo.salary_min + jo.salary_max) / 2.0) / 12.0
        when jo.salary_min is not null and jo.salary_max is not null
          then (jo.salary_min + jo.salary_max) / 2.0
        when jo.salary_min is not null and jo.pay_period = 'yearly'
          then jo.salary_min / 12.0
        when jo.salary_max is not null and jo.pay_period = 'yearly'
          then jo.salary_max / 12.0
        else coalesce(jo.salary_min, jo.salary_max)
      end
  )::numeric(12,2) as median_offer_monthly,
  avg(ja.overall_offer_score)::numeric(6,2) as avg_offer_score,
  avg(ja.transparency_score)::numeric(6,2) as transparency_score_avg,
  timezone('utc'::text, now()) as refreshed_at
from public.job_offers jo
join public.job_offer_analyses ja on ja.job_offer_id = jo.id
where jo.status = 'approved'
  and jo.business_id is not null
group by jo.business_id;

create or replace view public.job_offer_role_city_metrics as
select
  jo.job_title_normalized,
  jo.city_slug,
  count(*)::int as approved_offer_count,
  avg(
    case
      when jo.salary_min is not null and jo.salary_max is not null and jo.pay_period = 'yearly'
        then ((jo.salary_min + jo.salary_max) / 2.0) / 12.0
      when jo.salary_min is not null and jo.salary_max is not null
        then (jo.salary_min + jo.salary_max) / 2.0
      when jo.salary_min is not null and jo.pay_period = 'yearly'
        then jo.salary_min / 12.0
      when jo.salary_max is not null and jo.pay_period = 'yearly'
        then jo.salary_max / 12.0
      else coalesce(jo.salary_min, jo.salary_max)
    end
  )::numeric(12,2) as avg_offer_monthly,
  percentile_cont(0.5) within group (
    order by
      case
        when jo.salary_min is not null and jo.salary_max is not null and jo.pay_period = 'yearly'
          then ((jo.salary_min + jo.salary_max) / 2.0) / 12.0
        when jo.salary_min is not null and jo.salary_max is not null
          then (jo.salary_min + jo.salary_max) / 2.0
        when jo.salary_min is not null and jo.pay_period = 'yearly'
          then jo.salary_min / 12.0
        when jo.salary_max is not null and jo.pay_period = 'yearly'
          then jo.salary_max / 12.0
        else coalesce(jo.salary_min, jo.salary_max)
      end
  )::numeric(12,2) as median_offer_monthly,
  avg(ja.overall_offer_score)::numeric(6,2) as avg_offer_score,
  timezone('utc'::text, now()) as refreshed_at
from public.job_offers jo
join public.job_offer_analyses ja on ja.job_offer_id = jo.id
where jo.status = 'approved'
  and jo.job_title_normalized is not null
  and jo.city_slug is not null
group by jo.job_title_normalized, jo.city_slug;

grant select on public.job_offer_company_metrics to authenticated, anon, service_role;
grant select on public.job_offer_role_city_metrics to authenticated, anon, service_role;

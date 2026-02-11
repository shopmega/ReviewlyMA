-- Analytics + monitoring tables referenced by src/

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  user_id uuid references auth.users(id) on delete set null,
  business_id text references public.businesses(id) on delete set null,
  session_id text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  properties jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.analytics_events enable row level security;
do $$ begin
  create policy "Public can insert analytics events"
    on public.analytics_events for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage analytics events"
    on public.analytics_events for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_analytics_events_timestamp on public.analytics_events(timestamp desc);
create index if not exists idx_analytics_events_event on public.analytics_events(event);
create index if not exists idx_analytics_events_session_id on public.analytics_events(session_id);

create table if not exists public.search_analytics (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  city text,
  results_count integer not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.search_analytics enable row level security;
do $$ begin
  create policy "Public can insert search analytics"
    on public.search_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage search analytics"
    on public.search_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace view public.search_logs as
select query, count(*)::int as count
from public.search_analytics
group by query;

grant select on public.search_logs to anon;
grant select on public.search_logs to authenticated;

create table if not exists public.business_analytics (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.business_analytics enable row level security;
do $$ begin
  create policy "Public can insert business analytics"
    on public.business_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage business analytics"
    on public.business_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_business_analytics_business_id on public.business_analytics(business_id);
create index if not exists idx_business_analytics_event_type on public.business_analytics(event_type);
create index if not exists idx_business_analytics_created_at on public.business_analytics(created_at desc);

create table if not exists public.carousel_analytics (
  id uuid primary key default gen_random_uuid(),
  collection_id text,
  event_type text not null check (event_type in ('impression','click')),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.carousel_analytics enable row level security;
do $$ begin
  create policy "Public can insert carousel analytics"
    on public.carousel_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage carousel analytics"
    on public.carousel_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.error_reports (
  id text primary key,
  message text not null,
  stack text,
  type text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  url text not null,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  context jsonb not null default '{}'::jsonb,
  severity text not null,
  resolved boolean not null default false,
  occurrences integer not null default 1,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

alter table public.error_reports enable row level security;
do $$ begin
  create policy "Public can insert error reports"
    on public.error_reports for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage error reports"
    on public.error_reports for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;


-- Advertising / monetization tables referenced by src/

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references auth.users(id) on delete set null,
  title text not null,
  content text not null,
  target_business_ids text[],
  targeting_criteria jsonb,
  budget_cents integer not null default 0,
  spent_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.ads enable row level security;
do $$ begin
  create policy "Users can view their own ads"
    on public.ads for select
    using (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can create ads"
    on public.ads for insert to authenticated
    with check (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can update their ads"
    on public.ads for update to authenticated
    using (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage ads"
    on public.ads for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
before update on public.ads
for each row execute function public.update_updated_at_column();

create table if not exists public.competitor_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_business_id text references public.businesses(id) on delete cascade,
  target_competitor_ids text[],
  title text not null,
  content text not null,
  media_urls text[],
  budget_cents integer not null default 0,
  spent_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.competitor_ads enable row level security;
do $$ begin
  create policy "Business owners can manage competitor ads"
    on public.competitor_ads for all to authenticated
    using (
      exists (
        select 1 from public.businesses b
        where b.id = competitor_ads.advertiser_business_id
          and b.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.businesses b
        where b.id = competitor_ads.advertiser_business_id
          and b.owner_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage competitor ads"
    on public.competitor_ads for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_competitor_ads_updated_at on public.competitor_ads;
create trigger trg_competitor_ads_updated_at
before update on public.competitor_ads
for each row execute function public.update_updated_at_column();

create table if not exists public.pinned_content (
  id uuid primary key default gen_random_uuid(),
  business_id text references public.businesses(id) on delete cascade,
  title text not null,
  content text not null,
  media_urls text[],
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.pinned_content enable row level security;
do $$ begin
  create policy "Business owners can manage pinned content"
    on public.pinned_content for all to authenticated
    using (
      exists (select 1 from public.businesses b where b.id = pinned_content.business_id and b.owner_id = auth.uid())
    )
    with check (
      exists (select 1 from public.businesses b where b.id = pinned_content.business_id and b.owner_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage pinned content"
    on public.pinned_content for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_pinned_content_updated_at on public.pinned_content;
create trigger trg_pinned_content_updated_at
before update on public.pinned_content
for each row execute function public.update_updated_at_column();


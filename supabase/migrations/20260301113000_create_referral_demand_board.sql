-- Public demand board for referral candidates.

create table if not exists public.job_referral_demand_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  target_role text not null,
  city text,
  contract_type text,
  work_mode text,
  seniority text,
  summary text not null,
  details text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed', 'rejected')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_referral_demand_listings_status_created_at
  on public.job_referral_demand_listings(status, created_at desc);
create index if not exists idx_job_referral_demand_listings_city
  on public.job_referral_demand_listings(city);
create index if not exists idx_job_referral_demand_listings_user_id
  on public.job_referral_demand_listings(user_id, created_at desc);

 drop trigger if exists trg_job_referral_demand_listings_updated_at on public.job_referral_demand_listings;
 create trigger trg_job_referral_demand_listings_updated_at
 before update on public.job_referral_demand_listings
 for each row execute function public.update_updated_at_column();

alter table public.job_referral_demand_listings enable row level security;

drop policy if exists "Public can read active referral demand listings" on public.job_referral_demand_listings;
create policy "Public can read active referral demand listings"
on public.job_referral_demand_listings for select
using (status = 'active');

drop policy if exists "Users can insert own referral demand listings" on public.job_referral_demand_listings;
create policy "Users can insert own referral demand listings"
on public.job_referral_demand_listings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own referral demand listings" on public.job_referral_demand_listings;
create policy "Users can update own referral demand listings"
on public.job_referral_demand_listings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own referral demand listings" on public.job_referral_demand_listings;
create policy "Users can delete own referral demand listings"
on public.job_referral_demand_listings for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can manage referral demand listings" on public.job_referral_demand_listings;
create policy "Admins can manage referral demand listings"
on public.job_referral_demand_listings for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

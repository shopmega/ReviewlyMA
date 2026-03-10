create table if not exists public.job_referral_demand_responses (
  id uuid primary key default gen_random_uuid(),
  demand_listing_id uuid not null references public.job_referral_demand_listings(id) on delete cascade,
  responder_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  referral_offer_id uuid references public.job_referral_offers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (demand_listing_id, responder_user_id)
);

create index if not exists idx_job_referral_demand_responses_listing_status_created
  on public.job_referral_demand_responses(demand_listing_id, status, created_at desc);

create index if not exists idx_job_referral_demand_responses_responder_created
  on public.job_referral_demand_responses(responder_user_id, created_at desc);

drop trigger if exists trg_job_referral_demand_responses_updated_at on public.job_referral_demand_responses;
create trigger trg_job_referral_demand_responses_updated_at
before update on public.job_referral_demand_responses
for each row execute function public.update_updated_at_column();

alter table public.job_referral_demand_responses enable row level security;
alter table public.job_referral_demand_responses force row level security;

drop policy if exists "Users can read own demand responses" on public.job_referral_demand_responses;
create policy "Users can read own demand responses"
on public.job_referral_demand_responses for select
to authenticated
using (auth.uid() = responder_user_id);

drop policy if exists "Demand owners can read responses" on public.job_referral_demand_responses;
create policy "Demand owners can read responses"
on public.job_referral_demand_responses for select
to authenticated
using (
  exists (
    select 1
    from public.job_referral_demand_listings d
    where d.id = demand_listing_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "Users can create demand responses" on public.job_referral_demand_responses;
create policy "Users can create demand responses"
on public.job_referral_demand_responses for insert
to authenticated
with check (
  auth.uid() = responder_user_id
  and status = 'active'
  and exists (
    select 1
    from public.job_referral_demand_listings d
    where d.id = demand_listing_id
      and d.user_id <> auth.uid()
      and d.status = 'active'
      and (d.expires_at is null or d.expires_at > timezone('utc'::text, now()))
  )
);

drop policy if exists "Users can update own demand responses" on public.job_referral_demand_responses;
create policy "Users can update own demand responses"
on public.job_referral_demand_responses for update
to authenticated
using (auth.uid() = responder_user_id)
with check (auth.uid() = responder_user_id);

drop policy if exists "Users can delete own demand responses" on public.job_referral_demand_responses;
create policy "Users can delete own demand responses"
on public.job_referral_demand_responses for delete
to authenticated
using (auth.uid() = responder_user_id);

drop policy if exists "Admins can manage demand responses" on public.job_referral_demand_responses;
create policy "Admins can manage demand responses"
on public.job_referral_demand_responses for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

grant select, insert, update, delete on public.job_referral_demand_responses to authenticated;
grant all on public.job_referral_demand_responses to service_role;

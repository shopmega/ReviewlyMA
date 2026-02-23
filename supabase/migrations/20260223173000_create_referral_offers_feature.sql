-- Employee referral marketplace (parrainage) core tables + eligibility gate.
-- A user can publish referral offers only if:
-- 1) email is verified, and
-- 2) user has at least one published review OR one published salary entry.

create table if not exists public.job_referral_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id text references public.businesses(id) on delete set null,
  company_name text not null,
  job_title text not null,
  city text,
  contract_type text,
  work_mode text,
  seniority text,
  description text not null,
  requirements text,
  slots integer not null default 1 check (slots > 0),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'closed', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_referral_offers_status_created_at
  on public.job_referral_offers(status, created_at desc);
create index if not exists idx_job_referral_offers_business_id
  on public.job_referral_offers(business_id);
create index if not exists idx_job_referral_offers_city
  on public.job_referral_offers(city);
create index if not exists idx_job_referral_offers_user_id
  on public.job_referral_offers(user_id);

drop trigger if exists trg_job_referral_offers_updated_at on public.job_referral_offers;
create trigger trg_job_referral_offers_updated_at
before update on public.job_referral_offers
for each row execute function public.update_updated_at_column();

create table if not exists public.job_referral_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.job_referral_offers(id) on delete cascade,
  candidate_user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  cv_url text,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'referred', 'interview', 'hired', 'rejected', 'withdrawn')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (offer_id, candidate_user_id)
);

create index if not exists idx_job_referral_requests_offer_status
  on public.job_referral_requests(offer_id, status);
create index if not exists idx_job_referral_requests_candidate
  on public.job_referral_requests(candidate_user_id, created_at desc);

drop trigger if exists trg_job_referral_requests_updated_at on public.job_referral_requests;
create trigger trg_job_referral_requests_updated_at
before update on public.job_referral_requests
for each row execute function public.update_updated_at_column();

create or replace function public.can_user_publish_referral_offer(p_user_id uuid)
returns table (
  is_eligible boolean,
  is_email_verified boolean,
  has_published_review boolean,
  has_published_salary boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email_verified boolean := false;
  v_has_review boolean := false;
  v_has_salary boolean := false;
begin
  select (u.email_confirmed_at is not null)
    into v_email_verified
  from auth.users u
  where u.id = p_user_id;

  select exists(
    select 1
    from public.reviews r
    where r.user_id = p_user_id
      and r.status = 'published'
  )
  into v_has_review;

  select exists(
    select 1
    from public.salaries s
    where s.user_id = p_user_id
      and s.status = 'published'
  )
  into v_has_salary;

  return query
  select
    (v_email_verified and (v_has_review or v_has_salary)) as is_eligible,
    v_email_verified as is_email_verified,
    v_has_review as has_published_review,
    v_has_salary as has_published_salary,
    case
      when not v_email_verified then 'email_not_verified'
      when not (v_has_review or v_has_salary) then 'needs_published_review_or_salary'
      else 'eligible'
    end as reason;
end;
$$;

grant execute on function public.can_user_publish_referral_offer(uuid) to authenticated;
grant execute on function public.can_user_publish_referral_offer(uuid) to service_role;

alter table public.job_referral_offers enable row level security;
alter table public.job_referral_requests enable row level security;

drop policy if exists "Public can read active referral offers" on public.job_referral_offers;
create policy "Public can read active referral offers"
on public.job_referral_offers for select
using (status = 'active');

drop policy if exists "Users can insert own referral offers if eligible" on public.job_referral_offers;
create policy "Users can insert own referral offers if eligible"
on public.job_referral_offers for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.can_user_publish_referral_offer(auth.uid()) e
    where e.is_eligible = true
  )
);

drop policy if exists "Users can update own referral offers" on public.job_referral_offers;
create policy "Users can update own referral offers"
on public.job_referral_offers for update
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

drop policy if exists "Users can delete own referral offers" on public.job_referral_offers;
create policy "Users can delete own referral offers"
on public.job_referral_offers for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Candidates can read own requests" on public.job_referral_requests;
create policy "Candidates can read own requests"
on public.job_referral_requests for select
to authenticated
using (auth.uid() = candidate_user_id);

drop policy if exists "Offer owners can read offer requests" on public.job_referral_requests;
create policy "Offer owners can read offer requests"
on public.job_referral_requests for select
to authenticated
using (
  exists (
    select 1
    from public.job_referral_offers o
    where o.id = offer_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Candidates can create referral requests" on public.job_referral_requests;
create policy "Candidates can create referral requests"
on public.job_referral_requests for insert
to authenticated
with check (
  auth.uid() = candidate_user_id
  and exists (
    select 1
    from public.job_referral_offers o
    where o.id = offer_id
      and o.status = 'active'
      and o.user_id <> auth.uid()
  )
);

drop policy if exists "Candidates can update own referral requests" on public.job_referral_requests;
create policy "Candidates can update own referral requests"
on public.job_referral_requests for update
to authenticated
using (auth.uid() = candidate_user_id)
with check (auth.uid() = candidate_user_id);

drop policy if exists "Offer owners can update referral requests" on public.job_referral_requests;
create policy "Offer owners can update referral requests"
on public.job_referral_requests for update
to authenticated
using (
  exists (
    select 1
    from public.job_referral_offers o
    where o.id = offer_id
      and o.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.job_referral_offers o
    where o.id = offer_id
      and o.user_id = auth.uid()
  )
);

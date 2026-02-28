-- Harden referral demand listings constraints, visibility, and indexes.

-- Normalize legacy rows before enforcing strict checks.
update public.job_referral_demand_listings
set
  title = left(trim(title), 140),
  target_role = left(trim(target_role), 120),
  city = nullif(left(trim(coalesce(city, '')), 80), ''),
  summary = left(trim(summary), 1000),
  details = case
    when details is null then null
    else nullif(left(trim(details), 3000), '')
  end,
  contract_type = case
    when contract_type in ('cdi', 'cdd', 'stage', 'freelance', 'alternance', 'autre') then contract_type
    else null
  end,
  work_mode = case
    when work_mode in ('onsite', 'hybrid', 'remote') then work_mode
    else null
  end,
  seniority = case
    when seniority in ('junior', 'confirme', 'senior', 'lead', 'manager', 'autre') then seniority
    else null
  end,
  updated_at = timezone('utc'::text, now());

-- Any active row that is already expired should be closed to remain policy-compatible.
update public.job_referral_demand_listings
set
  status = 'closed',
  updated_at = timezone('utc'::text, now())
where status = 'active'
  and expires_at is not null
  and expires_at <= timezone('utc'::text, now());

alter table public.job_referral_demand_listings
  add constraint job_referral_demand_listings_title_len_check
    check (char_length(trim(title)) between 6 and 140),
  add constraint job_referral_demand_listings_target_role_len_check
    check (char_length(trim(target_role)) between 2 and 120),
  add constraint job_referral_demand_listings_summary_len_check
    check (char_length(trim(summary)) between 60 and 1000),
  add constraint job_referral_demand_listings_details_len_check
    check (details is null or char_length(trim(details)) <= 3000),
  add constraint job_referral_demand_listings_city_len_check
    check (city is null or char_length(trim(city)) <= 80),
  add constraint job_referral_demand_listings_contract_type_check
    check (contract_type is null or contract_type in ('cdi', 'cdd', 'stage', 'freelance', 'alternance', 'autre')),
  add constraint job_referral_demand_listings_work_mode_check
    check (work_mode is null or work_mode in ('onsite', 'hybrid', 'remote')),
  add constraint job_referral_demand_listings_seniority_check
    check (seniority is null or seniority in ('junior', 'confirme', 'senior', 'lead', 'manager', 'autre')),
  add constraint job_referral_demand_listings_expires_future_check
    check (expires_at is null or expires_at > created_at);

-- Public listings should only include active and non-expired entries.
drop policy if exists "Public can read active referral demand listings" on public.job_referral_demand_listings;
create policy "Public can read active referral demand listings"
on public.job_referral_demand_listings for select
using (
  status = 'active'
  and (expires_at is null or expires_at > timezone('utc'::text, now()))
);

-- Support high-read listing paths and feed sort queries.
create index if not exists idx_job_referral_demand_listings_active_expires_created
  on public.job_referral_demand_listings(expires_at, created_at desc)
  where status = 'active';

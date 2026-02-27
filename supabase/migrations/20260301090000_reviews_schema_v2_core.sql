begin;

-- Reviews v2 core fields for credibility, moderation context, and lifecycle.
alter table public.reviews
  add column if not exists employment_status text,
  add column if not exists role_slug text,
  add column if not exists department_slug text,
  add column if not exists city_slug text,
  add column if not exists tenure_band text,
  add column if not exists contract_type text,
  add column if not exists work_mode text,
  add column if not exists pros text,
  add column if not exists cons text,
  add column if not exists advice_to_management text,
  add column if not exists would_recommend boolean,
  add column if not exists ceo_approval boolean,
  add column if not exists experience_start_month date,
  add column if not exists experience_end_month date,
  add column if not exists moderation_reason_code text,
  add column if not exists risk_score numeric(5,2) not null default 0,
  add column if not exists risk_flags jsonb not null default '{}'::jsonb,
  add column if not exists current_version int not null default 1,
  add column if not exists published_at timestamptz;

-- Replace legacy status check with expanded moderation lifecycle.
alter table public.reviews
  drop constraint if exists reviews_status_check;

alter table public.reviews
  add constraint reviews_status_check
  check (status in (
    'draft',
    'submitted',
    'pending',
    'approved',
    'published',
    'rejected',
    'hidden',
    'under_investigation',
    'edited_requires_review',
    'appealed',
    'restored',
    'deleted'
  ));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_employment_status_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_employment_status_check
      check (employment_status is null or employment_status in ('current', 'former', 'candidate'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_tenure_band_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_tenure_band_check
      check (tenure_band is null or tenure_band in ('lt_6m', '6_12m', '1_2y', '3_5y', 'gt_5y'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_contract_type_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_contract_type_check
      check (contract_type is null or contract_type in ('cdi', 'cdd', 'intern', 'freelance', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_work_mode_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_work_mode_check
      check (work_mode is null or work_mode in ('onsite', 'hybrid', 'remote'));
  end if;
end
$$;

-- Helpful read/query paths for company pages and moderation.
create index if not exists idx_reviews_business_status_date
  on public.reviews (business_id, status, date desc);

create index if not exists idx_reviews_role_city_status
  on public.reviews (role_slug, city_slug, status);

create index if not exists idx_reviews_status_created_at_v2
  on public.reviews (status, created_at desc);

commit;


begin;

create table if not exists public.business_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city text not null,
  description text,
  location text,
  suggested_by uuid references auth.users(id) on delete set null,
  suggested_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text
);

create index if not exists idx_business_suggestions_status on public.business_suggestions(status);
create index if not exists idx_business_suggestions_suggested_by on public.business_suggestions(suggested_by);
create index if not exists idx_business_suggestions_category on public.business_suggestions(category);
create index if not exists idx_business_suggestions_city on public.business_suggestions(city);

alter table public.business_suggestions enable row level security;

drop policy if exists "Users can insert suggestions" on public.business_suggestions;
create policy "Users can insert suggestions"
  on public.business_suggestions
  for insert
  with check (auth.uid() = suggested_by);

drop policy if exists "Users can view their suggestions" on public.business_suggestions;
create policy "Users can view their suggestions"
  on public.business_suggestions
  for select
  using (auth.uid() = suggested_by);

drop policy if exists "Admins can view all suggestions" on public.business_suggestions;
create policy "Admins can view all suggestions"
  on public.business_suggestions
  for select
  using (
    auth.role() = 'service_role'
    or public.is_admin_user(auth.uid())
  );

drop policy if exists "Admins can update suggestions" on public.business_suggestions;
create policy "Admins can update suggestions"
  on public.business_suggestions
  for update
  using (
    auth.role() = 'service_role'
    or public.is_admin_user(auth.uid())
  );

commit;


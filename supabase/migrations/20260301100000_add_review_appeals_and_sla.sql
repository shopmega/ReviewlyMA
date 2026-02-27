begin;

-- SLA/tracking fields on reviews moderation lifecycle.
alter table public.reviews
  add column if not exists moderation_sla_due_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists idx_reviews_status_sla_due
  on public.reviews (status, moderation_sla_due_at);

create index if not exists idx_reviews_reviewed_at
  on public.reviews (reviewed_at desc);

-- Appeals table for review authors and company owners.
create table if not exists public.review_appeals (
  id uuid primary key default gen_random_uuid(),
  review_id bigint not null references public.reviews(id) on delete cascade,
  appellant_user_id uuid not null references auth.users(id) on delete cascade,
  appeal_type text not null check (appeal_type in ('author', 'company_owner')),
  message text not null check (length(trim(message)) >= 10 and length(message) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_review', 'accepted', 'rejected')),
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists trg_review_appeals_updated_at on public.review_appeals;
create trigger trg_review_appeals_updated_at
before update on public.review_appeals
for each row execute function public.update_updated_at_column();

create index if not exists idx_review_appeals_status_created_at
  on public.review_appeals (status, created_at desc);

create index if not exists idx_review_appeals_review_id
  on public.review_appeals (review_id);

create index if not exists idx_review_appeals_appellant
  on public.review_appeals (appellant_user_id, created_at desc);

-- Allow only one active appeal per (review, appellant) to reduce spam.
create unique index if not exists idx_review_appeals_unique_active
  on public.review_appeals (review_id, appellant_user_id)
  where status in ('open', 'in_review');

alter table public.review_appeals enable row level security;

do $$ begin
  create policy "Users can create own review appeals"
    on public.review_appeals for insert to authenticated
    with check (auth.uid() = appellant_user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can view own review appeals"
    on public.review_appeals for select to authenticated
    using (auth.uid() = appellant_user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage review appeals"
    on public.review_appeals for all
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage review appeals"
    on public.review_appeals for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Helper RPC for admin resolution to keep transitions auditable and consistent.
create or replace function public.resolve_review_appeal(
  p_appeal_id uuid,
  p_status text,
  p_resolution_note text default null
)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_review_id bigint;
  v_target_status text;
begin
  if v_uid is null then
    return query select false, 'Authentication required';
    return;
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return query select false, 'Admin permission required';
    return;
  end if;

  if p_status not in ('accepted', 'rejected') then
    return query select false, 'Invalid resolution status';
    return;
  end if;

  update public.review_appeals
  set
    status = p_status,
    resolution_note = p_resolution_note,
    resolved_by = v_uid,
    resolved_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  where id = p_appeal_id
    and status in ('open', 'in_review')
  returning review_id into v_review_id;

  if v_review_id is null then
    return query select false, 'Appeal not found or already resolved';
    return;
  end if;

  if p_status = 'accepted' then
    -- Accepted appeal restores visibility by default.
    v_target_status := 'restored';
    perform public.transition_review_status(v_review_id, v_target_status, 'appeal_accepted_restore', p_resolution_note);
  else
    perform public.transition_review_status(v_review_id, 'rejected', 'appeal_rejected', p_resolution_note);
  end if;

  return query select true, 'Appeal resolved';
end;
$$;

grant execute on function public.resolve_review_appeal(uuid, text, text) to authenticated;
grant execute on function public.resolve_review_appeal(uuid, text, text) to service_role;

commit;


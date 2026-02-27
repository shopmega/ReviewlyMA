begin;

create table if not exists public.review_moderation_events (
  id bigserial primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason_code text not null,
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system',
  risk_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_review_moderation_events_review_id_created_at
  on public.review_moderation_events (review_id, created_at desc);

create index if not exists idx_review_moderation_events_to_status_created_at
  on public.review_moderation_events (to_status, created_at desc);

alter table public.review_moderation_events enable row level security;

do $$ begin
  create policy "Admins can manage review moderation events"
    on public.review_moderation_events for all
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
  create policy "Authors can view own review moderation events"
    on public.review_moderation_events for select to authenticated
    using (
      exists (
        select 1
        from public.reviews r
        where r.id = review_moderation_events.review_id
          and r.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage review moderation events"
    on public.review_moderation_events for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace function public.log_review_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := 'system';
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if v_uid is not null then
    select p.role
    into v_role
    from public.profiles p
    where p.id = v_uid;
  end if;

  insert into public.review_moderation_events (
    review_id,
    from_status,
    to_status,
    reason_code,
    note,
    actor_user_id,
    actor_role,
    risk_snapshot
  ) values (
    new.id,
    old.status,
    new.status,
    coalesce(new.moderation_reason_code, 'status_change'),
    null,
    v_uid,
    coalesce(v_role, 'system'),
    coalesce(new.risk_flags, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists trg_log_review_status_transition on public.reviews;
create trigger trg_log_review_status_transition
after update of status on public.reviews
for each row execute function public.log_review_status_transition();

-- Explicit transition RPC for admin/moderator tooling.
create or replace function public.transition_review_status(
  p_review_id bigint,
  p_to_status text,
  p_reason_code text,
  p_note text default null
)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
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

  update public.reviews
  set
    status = p_to_status,
    moderation_reason_code = p_reason_code,
    updated_at = timezone('utc'::text, now()),
    published_at = case
      when p_to_status in ('published', 'restored') then coalesce(published_at, timezone('utc'::text, now()))
      else published_at
    end
  where id = p_review_id;

  if not found then
    return query select false, 'Review not found';
    return;
  end if;

  if p_note is not null and length(trim(p_note)) > 0 then
    update public.review_moderation_events
    set note = p_note
    where id = (
      select e.id
      from public.review_moderation_events e
      where e.review_id = p_review_id
      order by e.created_at desc
      limit 1
    );
  end if;

  return query select true, 'Status updated';
end;
$$;

grant execute on function public.transition_review_status(bigint, text, text, text) to authenticated;
grant execute on function public.transition_review_status(bigint, text, text, text) to service_role;

commit;


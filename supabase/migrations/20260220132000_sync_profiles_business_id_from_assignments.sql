-- Keep profiles.business_id in sync with canonical ownership sources.
-- Canonical precedence:
-- 1) user_businesses primary
-- 2) user_businesses latest assignment
-- 3) latest approved business_claims

create schema if not exists private;

create or replace function private.resolve_profile_business_id(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_business_id text;
begin
  -- 1) Primary assignment (if valid business exists)
  select ub.business_id
  into v_business_id
  from public.user_businesses ub
  join public.businesses b on b.id = ub.business_id
  where ub.user_id = p_user_id
    and ub.is_primary = true
  order by ub.updated_at desc nulls last, ub.created_at desc nulls last
  limit 1;

  if v_business_id is not null then
    return v_business_id;
  end if;

  -- 2) Any latest assignment
  select ub.business_id
  into v_business_id
  from public.user_businesses ub
  join public.businesses b on b.id = ub.business_id
  where ub.user_id = p_user_id
  order by ub.updated_at desc nulls last, ub.created_at desc nulls last
  limit 1;

  if v_business_id is not null then
    return v_business_id;
  end if;

  -- 3) Latest approved claim
  select bc.business_id
  into v_business_id
  from public.business_claims bc
  join public.businesses b on b.id = bc.business_id
  where bc.user_id = p_user_id
    and bc.status = 'approved'
  order by bc.created_at desc nulls last
  limit 1;

  return v_business_id;
end;
$$;

create or replace function private.sync_profile_business_id(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target_business_id text;
begin
  if p_user_id is null then
    return;
  end if;

  v_target_business_id := private.resolve_profile_business_id(p_user_id);

  update public.profiles p
  set
    business_id = v_target_business_id,
    updated_at = now()
  where p.id = p_user_id
    and coalesce(p.business_id, '') is distinct from coalesce(v_target_business_id, '');
end;
$$;

create or replace function private.trg_sync_profile_business_from_user_businesses()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.sync_profile_business_id(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.trg_sync_profile_business_from_claims()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.sync_profile_business_id(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_profile_business_from_user_businesses on public.user_businesses;
create trigger trg_sync_profile_business_from_user_businesses
after insert or update or delete on public.user_businesses
for each row
execute function private.trg_sync_profile_business_from_user_businesses();

drop trigger if exists trg_sync_profile_business_from_claims on public.business_claims;
create trigger trg_sync_profile_business_from_claims
after insert or update of user_id, business_id, status or delete on public.business_claims
for each row
execute function private.trg_sync_profile_business_from_claims();

-- Backfill existing profiles to remove current drift.
do $$
declare
  r record;
begin
  for r in
    select id
    from public.profiles
  loop
    perform private.sync_profile_business_id(r.id);
  end loop;
end $$;

-- Restrict business-owner review updates to reply fields only.
-- This prevents owners from editing rating/title/content/status on user reviews.

create or replace function public.enforce_review_owner_reply_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_business_owner boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- System/service updates (e.g. trigger-maintained counters) should pass.
  if v_uid is null then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.role = 'admin'
  ) into v_is_admin;

  if v_is_admin then
    return new;
  end if;

  select (
    exists (
      select 1
      from public.profiles p
      where p.id = v_uid
        and p.role = 'pro'
        and p.business_id = old.business_id
    )
    or exists (
      select 1
      from public.business_claims bc
      where bc.user_id = v_uid
        and bc.business_id = old.business_id
        and bc.status = 'approved'
    )
  ) into v_is_business_owner;

  -- Apply restriction only to business owners acting on others' reviews.
  if v_is_business_owner and old.user_id is distinct from v_uid then
    if (to_jsonb(new) - 'owner_reply' - 'owner_reply_date' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'owner_reply' - 'owner_reply_date' - 'updated_at') then
      raise exception 'Business owners can only update owner_reply fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_review_owner_reply_update_scope on public.reviews;
create trigger trg_enforce_review_owner_reply_update_scope
before update on public.reviews
for each row
execute function public.enforce_review_owner_reply_update_scope();

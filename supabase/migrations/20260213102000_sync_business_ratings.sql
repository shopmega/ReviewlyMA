begin;

-- Recalculate rating + review_count for one business from published reviews.
create or replace function public.recalculate_business_rating(p_business_id text)
returns void
language plpgsql
as $$
declare
  v_avg numeric(3,2);
  v_count integer;
begin
  select
    coalesce(round(avg(r.rating)::numeric, 2), 0),
    count(*)::int
  into v_avg, v_count
  from public.reviews r
  where r.business_id = p_business_id
    and r.status = 'published';

  update public.businesses b
  set
    overall_rating = v_avg,
    average_rating = v_avg,
    review_count = v_count,
    updated_at = timezone('utc'::text, now())
  where b.id = p_business_id;
end;
$$;

-- Trigger function to keep business rating fields in sync with reviews.
create or replace function public.handle_review_rating_sync()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_business_rating(new.business_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_business_rating(old.business_id);
    return old;
  end if;

  -- UPDATE: handle potential business move + status/rating changes.
  if old.business_id is distinct from new.business_id then
    perform public.recalculate_business_rating(old.business_id);
    perform public.recalculate_business_rating(new.business_id);
  else
    perform public.recalculate_business_rating(new.business_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reviews_sync_business_rating on public.reviews;
create trigger trg_reviews_sync_business_rating
after insert or update or delete on public.reviews
for each row execute function public.handle_review_rating_sync();

-- One-time backfill for existing businesses.
create or replace function public.sync_all_business_ratings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
begin
  with stats as (
    select
      b.id as business_id,
      coalesce(round(avg(r.rating)::numeric, 2), 0) as avg_rating,
      count(r.id)::int as review_count
    from public.businesses b
    left join public.reviews r
      on r.business_id = b.id
     and r.status = 'published'
    group by b.id
  ),
  updated as (
    update public.businesses b
    set
      overall_rating = s.avg_rating,
      average_rating = s.avg_rating,
      review_count = s.review_count,
      updated_at = timezone('utc'::text, now())
    from stats s
    where b.id = s.business_id
    returning 1
  )
  select count(*) into v_updated_count from updated;

  return jsonb_build_object('ok', true, 'businesses_updated', v_updated_count);
end;
$$;

grant execute on function public.sync_all_business_ratings() to service_role;

-- Apply the backfill right now in this migration.
select public.sync_all_business_ratings();

commit;


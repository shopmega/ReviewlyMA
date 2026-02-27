begin;

-- Return published review count for a scoped segment.
create or replace function public.get_published_review_segment_count(
  p_business_id text,
  p_role_slug text default null,
  p_city_slug text default null
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.reviews r
  where r.business_id = p_business_id
    and r.status = 'published'
    and (p_role_slug is null or r.role_slug = p_role_slug)
    and (p_city_slug is null or r.city_slug = p_city_slug);
$$;

-- Visibility helper based on k-anonymity threshold.
create or replace function public.can_show_review_segment(
  p_business_id text,
  p_role_slug text default null,
  p_city_slug text default null,
  p_threshold int default 5
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_published_review_segment_count(p_business_id, p_role_slug, p_city_slug) >= greatest(p_threshold, 1);
$$;

-- Guardrail summary helper for UI.
create or replace function public.get_review_visibility_guardrails(
  p_business_id text,
  p_threshold int default 5
)
returns table(
  total_published int,
  min_threshold int,
  can_show_overall boolean
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::int as total_published,
    greatest(p_threshold, 1) as min_threshold,
    (count(*)::int >= greatest(p_threshold, 1)) as can_show_overall
  from public.reviews r
  where r.business_id = p_business_id
    and r.status = 'published';
$$;

grant execute on function public.get_published_review_segment_count(text, text, text) to authenticated;
grant execute on function public.get_published_review_segment_count(text, text, text) to service_role;

grant execute on function public.can_show_review_segment(text, text, text, int) to authenticated;
grant execute on function public.can_show_review_segment(text, text, text, int) to service_role;

grant execute on function public.get_review_visibility_guardrails(text, int) to authenticated;
grant execute on function public.get_review_visibility_guardrails(text, int) to service_role;

commit;


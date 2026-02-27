drop function if exists public.get_my_referral_offer_requests();

create or replace function public.get_my_referral_offer_requests()
returns table (
  id uuid,
  offer_id uuid,
  candidate_user_id uuid,
  message text,
  status text,
  created_at timestamptz,
  cv_url text,
  linkedin_url text,
  response_due_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    r.id,
    r.offer_id,
    r.candidate_user_id,
    r.message,
    r.status,
    r.created_at,
    r.cv_url,
    r.linkedin_url,
    r.response_due_at
  from public.job_referral_requests r
  join public.job_referral_offers o
    on o.id = r.offer_id
  where o.user_id = auth.uid()
  order by r.created_at desc;
$$;

grant execute on function public.get_my_referral_offer_requests() to authenticated;
grant execute on function public.get_my_referral_offer_requests() to service_role;

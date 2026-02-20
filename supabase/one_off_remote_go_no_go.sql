-- GO/NO-GO checks: policies, critical functions/grants, and consistency summary.
-- Run in Supabase SQL Editor (read-only checks).

-- 1) Missing expected policies: must return zero rows.
with expected_policies as (
  select * from (values
    ('support_tickets', 'Users can view own tickets'),
    ('support_tickets', 'Users create tickets'),
    ('support_tickets', 'Admins can view all tickets'),
    ('support_tickets', 'Admins can update tickets'),
    ('support_ticket_messages', 'Users can view own ticket messages'),
    ('support_ticket_messages', 'Users can send messages to own tickets'),
    ('support_ticket_messages', 'Admins can view all ticket messages'),
    ('support_ticket_messages', 'Admins can send messages to any ticket'),
    ('business_claims', 'Users can view own claims'),
    ('business_claims', 'Users can create claims'),
    ('business_claims', 'Admins can view all claims'),
    ('business_claims', 'Users can update own claims for verification'),
    ('business_claims', 'Admins can update all claims'),
    ('reviews', 'Public reviews are viewable by everyone'),
    ('reviews', 'Users can insert their own reviews'),
    ('reviews', 'Users can update their own reviews'),
    ('reviews', 'Users can delete their own reviews'),
    ('reviews', 'Admins can manage reviews'),
    ('reviews', 'Service role can manage reviews'),
    ('review_reports', 'Users can create reports'),
    ('review_reports', 'Admins can view all reports'),
    ('review_reports', 'Admins can update reports'),
    ('premium_payments', 'Users can view their own payments'),
    ('premium_payments', 'Admins can view all payments'),
    ('premium_payments', 'Admins can update payments'),
    ('premium_payments', 'Service role can manage payments')
  ) as t(tablename, policyname)
)
select
  e.tablename,
  e.policyname as missing_policy
from expected_policies e
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = e.tablename
 and p.policyname = e.policyname
where p.policyname is null
order by e.tablename, e.policyname;

-- 2) Critical function existence + grants.
with critical_functions as (
  select * from (values
    ('public', 'is_admin_user', 'uuid'),
    ('public', 'toggle_user_premium', 'uuid, text, boolean, timestamp with time zone, timestamp with time zone'),
    ('public', 'safe_delete_user', 'uuid'),
    ('public', 'generate_salary_monthly_report', 'date, boolean')
  ) as f(schema_name, function_name, identity_args)
),
resolved as (
  select
    c.schema_name,
    c.function_name,
    c.identity_args,
    p.oid
  from critical_functions c
  left join pg_proc p
    on p.proname = c.function_name
   and pg_get_function_identity_arguments(p.oid) = c.identity_args
  left join pg_namespace n
    on n.oid = p.pronamespace
   and n.nspname = c.schema_name
)
select
  schema_name,
  function_name,
  identity_args,
  (oid is not null) as exists_in_db,
  case when oid is not null then has_function_privilege('service_role', oid, 'EXECUTE') end as service_role_can_execute,
  case when oid is not null then has_function_privilege('authenticated', oid, 'EXECUTE') end as authenticated_can_execute,
  case when oid is not null then has_function_privilege('anon', oid, 'EXECUTE') end as anon_can_execute
from resolved
order by function_name;

-- 3) Consistency summary.
select
  'site_settings_main_row_count' as check_name,
  count(*)::bigint as issue_count
from public.site_settings
where id = 'main'
union all
select 'review_reports_missing_review', count(*)::bigint
from public.review_reports rr
left join public.reviews r on r.id = rr.review_id
where r.id is null
union all
select 'support_tickets_missing_user_profile', count(*)::bigint
from public.support_tickets st
left join public.profiles p on p.id = st.user_id
where p.id is null
union all
select 'support_ticket_messages_missing_ticket', count(*)::bigint
from public.support_ticket_messages stm
left join public.support_tickets st on st.id = stm.ticket_id
where st.id is null
union all
select 'premium_payments_missing_user_profile', count(*)::bigint
from public.premium_payments pp
left join public.profiles p on p.id = pp.user_id
where p.id is null
union all
select 'business_claims_missing_business', count(*)::bigint
from public.business_claims bc
left join public.businesses b on b.id = bc.business_id
where bc.business_id is not null and b.id is null
union all
select 'support_tickets_invalid_status', count(*)::bigint
from public.support_tickets
where status not in ('pending', 'in_progress', 'resolved', 'closed')
union all
select 'support_tickets_invalid_priority', count(*)::bigint
from public.support_tickets
where priority not in ('low', 'medium', 'high')
union all
select 'business_claims_invalid_status', count(*)::bigint
from public.business_claims
where status not in ('pending', 'approved', 'rejected')
union all
select 'review_reports_invalid_status', count(*)::bigint
from public.review_reports
where status not in ('pending', 'resolved', 'dismissed')
union all
select 'premium_payments_invalid_status', count(*)::bigint
from public.premium_payments
where status not in ('pending', 'verified', 'rejected', 'refunded')
union all
select 'support_tickets_admin_response_but_unread_user_false_expected', count(*)::bigint
from public.support_tickets
where admin_response is not null and is_read_by_user = true
order by check_name;

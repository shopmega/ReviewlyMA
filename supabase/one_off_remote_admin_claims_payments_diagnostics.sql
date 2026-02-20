-- Extended diagnostics: admin/support, claims/reviews/payments, RPC/grants, consistency.
-- Run in Supabase SQL Editor on the target environment.
-- Read-only checks only.

-- =========================================================
-- 1) TABLE PRESENCE + RLS (admin/support + claims/reviews/payments)
-- =========================================================
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'support_tickets',
    'support_ticket_messages',
    'business_claims',
    'reviews',
    'review_reports',
    'premium_payments'
  )
order by tablename;

-- =========================================================
-- 2) POLICY INVENTORY + MISSING EXPECTED POLICIES
-- =========================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'support_tickets',
    'support_ticket_messages',
    'business_claims',
    'reviews',
    'review_reports',
    'premium_payments'
  )
order by tablename, policyname;

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

-- =========================================================
-- 3) CRITICAL RPC/FUNCTION EXISTENCE + EXECUTE PRIVILEGES
-- =========================================================
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

-- =========================================================
-- 4) DATA CONSISTENCY CHECKS (orphan rows, required rows, status integrity)
-- =========================================================

-- 4.a) Required singleton row(s)
select
  'site_settings_main_row_count' as check_name,
  count(*)::bigint as issue_count
from public.site_settings
where id = 'main';

-- 4.b) Orphan/invalid references that can break admin flows
select
  'review_reports_missing_review' as check_name,
  count(*)::bigint as issue_count
from public.review_reports rr
left join public.reviews r on r.id = rr.review_id
where r.id is null;

select
  'support_tickets_missing_user_profile' as check_name,
  count(*)::bigint as issue_count
from public.support_tickets st
left join public.profiles p on p.id = st.user_id
where p.id is null;

select
  'support_ticket_messages_missing_ticket' as check_name,
  count(*)::bigint as issue_count
from public.support_ticket_messages stm
left join public.support_tickets st on st.id = stm.ticket_id
where st.id is null;

select
  'premium_payments_missing_user_profile' as check_name,
  count(*)::bigint as issue_count
from public.premium_payments pp
left join public.profiles p on p.id = pp.user_id
where p.id is null;

select
  'business_claims_missing_business' as check_name,
  count(*)::bigint as issue_count
from public.business_claims bc
left join public.businesses b on b.id = bc.business_id
where bc.business_id is not null
  and b.id is null;

-- 4.c) Status/enum integrity snapshots (should normally be 0 due CHECK constraints)
select
  'support_tickets_invalid_status' as check_name,
  count(*)::bigint as issue_count
from public.support_tickets
where status not in ('pending', 'in_progress', 'resolved', 'closed');

select
  'support_tickets_invalid_priority' as check_name,
  count(*)::bigint as issue_count
from public.support_tickets
where priority not in ('low', 'medium', 'high');

select
  'business_claims_invalid_status' as check_name,
  count(*)::bigint as issue_count
from public.business_claims
where status not in ('pending', 'approved', 'rejected');

select
  'review_reports_invalid_status' as check_name,
  count(*)::bigint as issue_count
from public.review_reports
where status not in ('pending', 'resolved', 'dismissed');

select
  'premium_payments_invalid_status' as check_name,
  count(*)::bigint as issue_count
from public.premium_payments
where status not in ('pending', 'verified', 'rejected', 'refunded');

-- 4.d) Operational consistency checks for unread flags
select
  'support_tickets_admin_response_but_unread_user_false_expected' as check_name,
  count(*)::bigint as issue_count
from public.support_tickets
where admin_response is not null
  and is_read_by_user = true;


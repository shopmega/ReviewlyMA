-- GO/NO-GO checks for user profiles + pro dashboard domain.
-- Run in Supabase SQL Editor (read-only checks).

-- 1) Table presence + RLS
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'user_businesses',
    'premium_users',
    'messages',
    'saved_businesses',
    'favorites'
  )
order by tablename;

-- 2) Missing expected policies (must return 0 rows)
with expected_policies as (
  select * from (values
    ('profiles', 'Users can view own profile'),
    ('profiles', 'Users can update own profile'),
    ('profiles', 'Admins can view all profiles'),
    ('profiles', 'Service role can manage profiles'),
    ('user_businesses', 'Users can view own business assignments'),
    ('user_businesses', 'Admins can manage business assignments'),
    ('user_businesses', 'Service role can manage business assignments'),
    ('premium_users', 'Users can view own premium record'),
    ('premium_users', 'Admins can manage premium users'),
    ('premium_users', 'Service role can manage premium users'),
    ('messages', 'Anyone can send a regular message'),
    ('messages', 'Owners and admins can view messages'),
    ('messages', 'Owners and admins can update messages'),
    ('messages', 'Service role can manage messages'),
    ('saved_businesses', 'Users can view their own saved businesses'),
    ('saved_businesses', 'Users can save businesses'),
    ('saved_businesses', 'Users can unsave businesses'),
    ('favorites', 'Users can view their own favorites'),
    ('favorites', 'Users can insert their own favorites'),
    ('favorites', 'Users can delete their own favorites'),
    ('favorites', 'Business owners can view their followers')
  ) as t(tablename, policyname)
)
select e.tablename, e.policyname as missing_policy
from expected_policies e
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = e.tablename
 and p.policyname = e.policyname
where p.policyname is null
order by e.tablename, e.policyname;

-- 3) Critical function/grant checks for pro/user flows
with critical_functions as (
  select * from (values
    ('public', 'is_admin_user', 'uuid'),
    ('public', 'toggle_user_premium', 'uuid, text, boolean, timestamp with time zone, timestamp with time zone')
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

-- 4) Consistency checks
select 'profiles_invalid_role' as check_name, count(*)::bigint as issue_count
from public.profiles
where role not in ('user', 'pro', 'admin')
union all
select 'profiles_pro_without_business_id', count(*)::bigint
from public.profiles
where role = 'pro' and business_id is null
union all
select 'profiles_business_id_missing_business', count(*)::bigint
from public.profiles p
left join public.businesses b on b.id = p.business_id
where p.business_id is not null and b.id is null
union all
select 'profiles_premium_true_with_none_tier', count(*)::bigint
from public.profiles
where is_premium = true and coalesce(tier, 'none') = 'none'
union all
select 'profiles_premium_false_with_paid_tier', count(*)::bigint
from public.profiles
where is_premium = false and coalesce(tier, 'none') in ('gold', 'silver')
union all
select 'user_businesses_missing_user_profile', count(*)::bigint
from public.user_businesses ub
left join public.profiles p on p.id = ub.user_id
where p.id is null
union all
select 'user_businesses_missing_business', count(*)::bigint
from public.user_businesses ub
left join public.businesses b on b.id = ub.business_id
where b.id is null
union all
select 'user_businesses_multiple_primary_per_user', count(*)::bigint
from (
  select user_id
  from public.user_businesses
  where is_primary = true
  group by user_id
  having count(*) > 1
) t
union all
select 'premium_users_missing_profile', count(*)::bigint
from public.premium_users pu
left join public.profiles p on p.id = pu.user_id
where pu.user_id is not null and p.id is null
union all
select 'premium_users_invalid_status', count(*)::bigint
from public.premium_users
where subscription_status not in ('active', 'inactive', 'cancelled')
union all
select 'saved_businesses_missing_profile', count(*)::bigint
from public.saved_businesses sb
left join public.profiles p on p.id = sb.user_id
where p.id is null
union all
select 'saved_businesses_missing_business', count(*)::bigint
from public.saved_businesses sb
left join public.businesses b on b.id = sb.business_id
where b.id is null
union all
select 'favorites_missing_auth_user', count(*)::bigint
from public.favorites f
left join auth.users u on u.id = f.user_id
where u.id is null
union all
select 'favorites_missing_business', count(*)::bigint
from public.favorites f
left join public.businesses b on b.id = f.business_id
where b.id is null
union all
select 'messages_missing_business', count(*)::bigint
from public.messages m
left join public.businesses b on b.id = m.business_id
where b.id is null
union all
select 'messages_sender_profile_missing', count(*)::bigint
from public.messages m
left join public.profiles p on p.id = m.sender_id
where m.sender_id is not null and p.id is null
order by check_name;

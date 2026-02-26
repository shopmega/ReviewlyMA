-- Post-release QA checks for salary alert contracts and privacy rules.
-- Run in Supabase SQL editor (staging first, then production).

-- 1) Table existence and columns
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'salary_alert_subscriptions'
order by ordinal_position;

-- 2) Scope check constraints
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.salary_alert_subscriptions'::regclass
  and contype = 'c'
order by conname;

-- 3) Uniqueness indexes
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'salary_alert_subscriptions'
order by indexname;

-- 4) Trigger for updated_at
select tgname as trigger_name
from pg_trigger
where tgrelid = 'public.salary_alert_subscriptions'::regclass
  and not tgisinternal
order by tgname;

-- 5) RLS enabled
select relname, relrowsecurity
from pg_class
where oid = 'public.salary_alert_subscriptions'::regclass;

-- 6) Policy presence
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'salary_alert_subscriptions'
order by policyname;

-- 7) Sample data evidence
select id, user_id, scope, business_id, role_slug, sector_slug, city_slug, created_at, updated_at
from public.salary_alert_subscriptions
order by created_at desc
limit 20;

-- 8) Notifications evidence for salary updates and digest
select id, user_id, type, title, link, is_read, created_at
from public.notifications
where type in ('salary_update', 'salary_digest_weekly')
order by created_at desc
limit 50;


-- Post-deploy diagnostics for current security/data fixes.
-- Run in Supabase SQL Editor on the target environment.
-- Read-only checks only.

-- 1) Discover migration-tracking tables (differs by environment/setup).
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and c.relname ilike '%schema_migrations%'
order by n.nspname, c.relname;

-- 2) Confirm site_settings partner columns exist.
select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'site_settings'
  and column_name in ('partner_app_name', 'partner_app_url')
order by column_name;

-- 3) Confirm site_settings has main row and partner values.
select id, partner_app_name, partner_app_url, updated_at
from public.site_settings
where id = 'main';

-- 4) Confirm RLS and policies on site_settings.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'site_settings';

select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'site_settings'
order by policyname;

-- 5) Confirm salary_monthly_reports RLS + expected policies.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'salary_monthly_reports';

select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'salary_monthly_reports'
order by policyname;

-- 6) Confirm exposed views are security_invoker=true.
select
  n.nspname as schema_name,
  c.relname as view_name,
  coalesce(c.reloptions::text, '{}') as reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in (
    'salary_city_sector_metrics',
    'salary_role_city_metrics',
    'salary_company_metrics',
    'salary_city_metrics',
    'salary_monthly_reports_public',
    'search_logs'
  )
order by c.relname;

-- 7) Optional: force PostgREST schema reload if you still see schema cache errors.
-- NOTIFY pgrst, 'reload schema';

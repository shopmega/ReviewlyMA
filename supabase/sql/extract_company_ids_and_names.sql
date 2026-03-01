-- Extract company IDs and names from existing records.
-- Run in Supabase SQL editor.

-- 1) Basic export: all non-deleted companies
select
  b.id,
  b.name
from public.businesses b
where coalesce(b.status, '') <> 'deleted'
order by b.name asc;

-- 2) Optional: include slug/city/category for easier curation
-- select
--   b.id,
--   b.name,
--   b.slug,
--   b.city,
--   b.category,
--   b.status
-- from public.businesses b
-- where coalesce(b.status, '') <> 'deleted'
-- order by b.name asc;

-- 3) Optional: only companies (if table also stores other business types)
-- select
--   b.id,
--   b.name
-- from public.businesses b
-- where coalesce(b.status, '') <> 'deleted'
--   and coalesce(b.type, 'company') = 'company'
-- order by b.name asc;

-- Cleanup seeded reviews created by selected-companies seed scripts.
-- Safe scope: only rows with deterministic seed moderation_reason_code prefixes.

-- 1) Preview what will be deleted
with target as (
  select r.id, r.business_id, r.moderation_reason_code, r.created_at
  from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_v1:%'
     or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
)
select
  count(*) as rows_to_delete,
  count(distinct business_id) as affected_businesses,
  min(created_at) as oldest_row,
  max(created_at) as newest_row
from target;

-- 2) Optional per-business preview
-- with target as (
--   select r.business_id
--   from public.reviews r
--   where r.moderation_reason_code like 'seed_selected_companies_v1:%'
--      or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
-- )
-- select business_id, count(*) as rows_to_delete
-- from target
-- group by business_id
-- order by rows_to_delete desc, business_id asc;

-- 3) Execute deletion (transactional)
begin;

with deleted as (
  delete from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_v1:%'
     or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
  returning r.id, r.business_id
)
select
  count(*) as deleted_rows,
  count(distinct business_id) as affected_businesses
from deleted;

commit;

-- 4) Post-check
with remaining as (
  select r.id
  from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_v1:%'
     or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
)
select count(*) as remaining_seeded_rows from remaining;

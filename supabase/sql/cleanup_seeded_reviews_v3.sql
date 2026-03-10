-- Cleanup review rows created by v3 realistic seed batch.
-- Scope A (default): only v3 rows.
-- Scope B (optional, commented): all selected-company review seed batches.

-- A1) Preview v3 rows to delete
with target as (
  select r.id, r.business_id, r.moderation_reason_code, r.created_at
  from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
)
select
  count(*) as rows_to_delete,
  count(distinct business_id) as affected_businesses,
  min(created_at) as oldest_row,
  max(created_at) as newest_row
from target;

-- A2) Delete v3 rows (transactional)
begin;

with deleted as (
  delete from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
  returning r.id, r.business_id
)
select
  count(*) as deleted_rows,
  count(distinct business_id) as affected_businesses
from deleted;

commit;

-- A3) Post-check v3
select count(*) as remaining_v3_seeded_rows
from public.reviews r
where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%';

-- --------------------------------------------------------------------------
-- B) OPTIONAL: Delete all review seed batches we created for selected companies
-- Uncomment and run only if you want a full reset of seeded reviews.
-- --------------------------------------------------------------------------
-- begin;
-- with deleted as (
--   delete from public.reviews r
--   where r.moderation_reason_code like 'seed_selected_companies_v1:%'
--      or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
--      or r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
--   returning r.id, r.business_id
-- )
-- select count(*) as deleted_rows, count(distinct business_id) as affected_businesses
-- from deleted;
-- commit;
--
-- select count(*) as remaining_all_seeded_rows
-- from public.reviews r
-- where r.moderation_reason_code like 'seed_selected_companies_v1:%'
--    or r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
--    or r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%';

-- Focused diagnostics for:
-- 1) Admin payment validation "Paiement introuvable"
-- 2) Pro dashboard update mismatch "Aucun etablissement mis a jour..."
-- Read-only checks.

-- =========================================================
-- A) PREMIUM PAYMENTS LOOKUP HEALTH
-- =========================================================

-- A1) Pending payments snapshot.
select
  id,
  payment_reference,
  status,
  user_id,
  business_id,
  created_at
from public.premium_payments
where status = 'pending'
order by created_at desc
limit 50;

-- A2) Payment reference quality (null/blank/duplicates).
select
  count(*) filter (where payment_reference is null or btrim(payment_reference) = '') as missing_reference_count,
  count(*) filter (where payment_reference is not null and btrim(payment_reference) <> '') as non_empty_reference_count
from public.premium_payments;

select
  payment_reference,
  count(*) as duplicate_count
from public.premium_payments
where payment_reference is not null
  and btrim(payment_reference) <> ''
group by payment_reference
having count(*) > 1
order by duplicate_count desc, payment_reference
limit 50;

-- A3) Verify table id type is UUID (expected by app logic).
select
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'premium_payments'
  and column_name in ('id', 'payment_reference', 'status', 'expires_at')
order by column_name;

-- A4) Check for typo table and schema cache drift risk.
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('premium_payments', 'premium_payements')
order by table_name;

-- =========================================================
-- B) PRO DASHBOARD BUSINESS-ID CONSISTENCY
-- =========================================================

-- B1) Pro/growth profiles referencing missing businesses.
select
  p.id as profile_id,
  p.email,
  p.role,
  p.business_id
from public.profiles p
left join public.businesses b on b.id = p.business_id
where p.role in ('pro', 'growth')
  and p.business_id is not null
  and b.id is null
order by p.email
limit 100;

-- B2) user_businesses links referencing missing businesses.
select
  ub.user_id,
  ub.business_id,
  ub.role,
  ub.is_primary
from public.user_businesses ub
left join public.businesses b on b.id = ub.business_id
where b.id is null
order by ub.user_id
limit 100;

-- B3) Approved claims referencing missing businesses.
select
  bc.id as claim_id,
  bc.user_id,
  bc.business_id,
  bc.status
from public.business_claims bc
left join public.businesses b on b.id = bc.business_id
where bc.status = 'approved'
  and b.id is null
order by bc.created_at desc
limit 100;

-- B4) Users with valid managed businesses but stale profile.business_id.
with managed as (
  select p.id as user_id, p.business_id as business_id
  from public.profiles p
  where p.role in ('pro', 'growth')
  union all
  select bc.user_id, bc.business_id
  from public.business_claims bc
  where bc.status = 'approved'
  union all
  select ub.user_id, ub.business_id
  from public.user_businesses ub
),
existing_managed as (
  select distinct m.user_id, m.business_id
  from managed m
  join public.businesses b on b.id = m.business_id
  where m.business_id is not null
),
profile_state as (
  select
    p.id as user_id,
    p.email,
    p.role,
    p.business_id as profile_business_id,
    exists (
      select 1 from public.businesses b where b.id = p.business_id
    ) as profile_business_exists,
    (
      select min(em.business_id)
      from existing_managed em
      where em.user_id = p.id
    ) as suggested_business_id
  from public.profiles p
  where p.role in ('pro', 'growth')
)
select
  user_id,
  email,
  role,
  profile_business_id,
  profile_business_exists,
  suggested_business_id
from profile_state
where (profile_business_id is null or profile_business_exists = false)
  and suggested_business_id is not null
order by email
limit 100;

-- =========================================================
-- C) OPTIONAL FIX PREVIEW (commented)
-- =========================================================
-- Use only after reviewing B4 output.
--
-- update public.profiles p
-- set business_id = fixes.suggested_business_id
-- from (
--   with managed as (
--     select bc.user_id, bc.business_id
--     from public.business_claims bc
--     where bc.status = 'approved'
--     union all
--     select ub.user_id, ub.business_id
--     from public.user_businesses ub
--   )
--   select m.user_id, min(m.business_id) as suggested_business_id
--   from managed m
--   join public.businesses b on b.id = m.business_id
--   group by m.user_id
-- ) fixes
-- where p.id = fixes.user_id
--   and (p.business_id is null or not exists (
--     select 1 from public.businesses b where b.id = p.business_id
--   ));

-- Verify seeded review/salary totals for selected companies.

with selected_ids(id) as (
  values
    ('maroc-telecom'),
    ('ocp-group'),
    ('attijariwafa-bank'),
    ('bank-of-africa-axjgw'),
    ('royal-air-maroc'),
    ('teleperformance-centre-palmier-e3wki'),
    ('teleperformance-maroc-npu9g'),
    ('intelcia-group'),
    ('phone-group-majorel-mnw1i'),
    ('capgemini-engineering'),
    ('deloitte-maroc-dp7us'),
    ('pwc-maroc-7gafj'),
    ('kpmg-maroc-1d7xe'),
    ('marjane-group-yfghu'),
    ('carrefour-maroc-tbmnd'),
    ('orange-maroc-zem4m'),
    ('inwi')
),
selected_companies as (
  select b.id
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
)
select
  (select count(*) from selected_companies) as selected_companies,
  (
    select count(*)
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
      and r.business_id in (select id from selected_companies)
  ) as seeded_reviews_bulk_batch,
  (
    select count(*)
    from public.salaries s
    where s.source = 'imported'
      and s.moderation_notes like '[seed_batch:seed_selected_companies_bulk_v1]%'
      and s.business_id in (select id from selected_companies)
  ) as seeded_salaries_bulk_batch,
  (
    select count(*) >= 200
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
      and r.business_id in (select id from selected_companies)
  ) as reached_reviews_target,
  (
    select count(*) >= 100
    from public.salaries s
    where s.source = 'imported'
      and s.moderation_notes like '[seed_batch:seed_selected_companies_bulk_v1]%'
      and s.business_id in (select id from selected_companies)
  ) as reached_salaries_target;

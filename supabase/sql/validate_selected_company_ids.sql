-- Validate a curated list of company IDs against public.businesses.
-- Returns matched companies first, then missing IDs.

with input_ids(id) as (
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
)
select
  i.id as requested_id,
  b.id as business_id,
  b.name,
  b.slug,
  b.city,
  b.category,
  b.status
from input_ids i
left join public.businesses b on b.id = i.id
order by
  case when b.id is null then 1 else 0 end,
  b.name asc,
  i.id asc;

-- Optional: only missing IDs
-- with input_ids(id) as (
--   values
--     ('maroc-telecom'),
--     ('ocp-group'),
--     ('attijariwafa-bank'),
--     ('bank-of-africa-axjgw'),
--     ('royal-air-maroc'),
--     ('teleperformance-centre-palmier-e3wki'),
--     ('teleperformance-maroc-npu9g'),
--     ('intelcia-group'),
--     ('phone-group-majorel-mnw1i'),
--     ('capgemini-engineering'),
--     ('deloitte-maroc-dp7us'),
--     ('pwc-maroc-7gafj'),
--     ('kpmg-maroc-1d7xe'),
--     ('marjane-group-yfghu'),
--     ('carrefour-maroc-tbmnd'),
--     ('orange-maroc-zem4m'),
--     ('inwi')
-- )
-- select i.id as missing_id
-- from input_ids i
-- left join public.businesses b on b.id = i.id
-- where b.id is null
-- order by i.id;

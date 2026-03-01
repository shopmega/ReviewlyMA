-- Seed salaries for a selected set of existing companies.
-- Safe behavior:
-- - only targets existing businesses from the curated ID list
-- - idempotent via deterministic seed_key encoded in moderation_notes
-- - updates existing seeded rows, inserts missing ones
-- - prunes only rows created by this batch

begin;

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
batch_meta as (
  select 'seed_selected_companies_v1'::text as batch
),
companies as (
  select b.id as business_id, b.name, coalesce(nullif(b.city, ''), 'Casablanca') as city, coalesce(b.category, '') as category
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
),
payload as (
  select
    c.business_id,
    case
      when c.category ilike '%banque%' then 'Analyste financier'
      when c.category ilike '%telecom%' then 'Ingenieur reseau'
      when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenieur logiciel'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Conseiller client'
      when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Responsable magasin'
      when c.category ilike '%transport%' or c.category ilike '%logistique%' then 'Coordinateur operations'
      when c.category ilike '%industrie%' or c.category ilike '%chimie%' then 'Ingenieur process'
      else 'Specialiste operations'
    end as job_title,
    case
      when c.category ilike '%banque%' then 13000::numeric
      when c.category ilike '%telecom%' then 15000::numeric
      when c.category ilike '%technologie%' or c.category ilike '%it%' then 17000::numeric
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 7000::numeric
      when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 9000::numeric
      when c.category ilike '%transport%' or c.category ilike '%logistique%' then 10500::numeric
      when c.category ilike '%industrie%' or c.category ilike '%chimie%' then 14000::numeric
      else 9500::numeric
    end as salary,
    c.city as location,
    'monthly'::text as pay_period,
    'MAD'::text as currency,
    'full_time'::text as employment_type,
    case
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 2
      when c.category ilike '%distribution%' then 4
      else 5
    end as years_experience,
    case
      when c.category ilike '%banque%' then 'Finance'
      when c.category ilike '%telecom%' then 'Ingenierie'
      when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenierie'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Support client'
      when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Operations'
      when c.category ilike '%transport%' or c.category ilike '%logistique%' then 'Operations'
      when c.category ilike '%industrie%' or c.category ilike '%chimie%' then 'Operations'
      else 'Operations'
    end as department,
    true as is_current,
    'imported'::text as source,
    'published'::text as status,
    (
      select format(
        '[seed_batch:%s][seed_key:%s] auto seeded salary sample for selected companies',
        m.batch,
        format('%s:%s:%s', m.batch, c.business_id, lower(regexp_replace(
          case
            when c.category ilike '%banque%' then 'Analyste financier'
            when c.category ilike '%telecom%' then 'Ingenieur reseau'
            when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenieur logiciel'
            when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Conseiller client'
            when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Responsable magasin'
            when c.category ilike '%transport%' or c.category ilike '%logistique%' then 'Coordinateur operations'
            when c.category ilike '%industrie%' or c.category ilike '%chimie%' then 'Ingenieur process'
            else 'Specialiste operations'
          end,
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        )))
      )
      from batch_meta m
    ) as moderation_notes
  from companies c
),
updated as (
  update public.salaries s
  set
    job_title = p.job_title,
    salary = p.salary,
    location = p.location,
    pay_period = p.pay_period,
    currency = p.currency,
    employment_type = p.employment_type,
    years_experience = p.years_experience,
    department = p.department,
    is_current = p.is_current,
    source = p.source,
    status = p.status,
    moderation_notes = p.moderation_notes,
    reviewed_at = timezone('utc'::text, now())
  from payload p
  where s.business_id = p.business_id
    and s.moderation_notes = p.moderation_notes
  returning s.id
),
inserted as (
  insert into public.salaries (
    business_id,
    job_title,
    salary,
    location,
    pay_period,
    currency,
    employment_type,
    years_experience,
    department,
    is_current,
    source,
    status,
    moderation_notes,
    reviewed_at
  )
  select
    p.business_id,
    p.job_title,
    p.salary,
    p.location,
    p.pay_period,
    p.currency,
    p.employment_type,
    p.years_experience,
    p.department,
    p.is_current,
    p.source,
    p.status,
    p.moderation_notes,
    timezone('utc'::text, now())
  from payload p
  where not exists (
    select 1
    from public.salaries s
    where s.business_id = p.business_id
      and s.moderation_notes = p.moderation_notes
  )
  returning id
),
pruned as (
  delete from public.salaries s
  where s.source = 'imported'
    and s.moderation_notes like '[seed_batch:seed_selected_companies_v1]%'
    and s.business_id in (select business_id from companies)
    and s.moderation_notes not in (select moderation_notes from payload)
  returning s.id
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from pruned) as pruned_rows;

-- Keep salary analytics in sync.
select public.refresh_salary_analytics_materialized_views();

commit;

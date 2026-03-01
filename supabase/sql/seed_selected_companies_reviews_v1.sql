-- Seed reviews for a selected set of existing companies.
-- Safe behavior:
-- - only targets existing businesses from the curated ID list
-- - idempotent via deterministic moderation_reason_code seed key
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
companies as (
  select b.id as business_id, b.name, coalesce(nullif(b.city, ''), 'Casablanca') as city, coalesce(b.category, '') as category
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
),
payload as (
  select
    c.business_id,
    format('seed_selected_companies_v1:%s:review-1', c.business_id) as moderation_reason_code,
    format('Retour d''experience %s (%s)', c.name, c.city) as title,
    format(
      'Environnement globalement structure et charge de travail stable sur la periode observee. Ce retour est un echantillon editorial pour initialiser la fiche entreprise %s.',
      c.name
    ) as content,
    case
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 4
      when c.category ilike '%distribution%' then 3
      else 4
    end as rating,
    case
      when c.category ilike '%telecom%' then 'Ingenieur reseau'
      when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenieur logiciel'
      when c.category ilike '%banque%' then 'Analyste financier'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Conseiller client'
      when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Responsable magasin'
      else 'Specialiste operations'
    end as role_slug,
    lower(regexp_replace(c.city, '[^a-zA-Z0-9]+', '-', 'g')) as city_slug,
    case
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Support client'
      when c.category ilike '%banque%' then 'Finance'
      else 'Operations'
    end as department_slug,
    'current'::text as employment_status,
    '1_2y'::text as tenure_band,
    'cdi'::text as contract_type,
    'onsite'::text as work_mode,
    'Equipe engagee et processus clairs'::text as pros,
    'Rythme parfois soutenu selon les periodes'::text as cons,
    'Structurer davantage les plans de progression interne'::text as advice_to_management,
    true as would_recommend,
    true as ceo_approval,
    (date_trunc('month', timezone('utc'::text, now())) - interval '10 months')::date as experience_start_month,
    (date_trunc('month', timezone('utc'::text, now())) - interval '2 months')::date as experience_end_month,
    current_date - 30 as date,
    'published'::text as status,
    timezone('utc'::text, now()) - interval '7 days' as published_at,
    jsonb_build_object('seed_batch', 'seed_selected_companies_v1', 'seeded', true) as risk_flags
  from companies c
),
updated as (
  update public.reviews r
  set
    business_id = p.business_id,
    author_name = 'Editorial Seed',
    is_anonymous = true,
    rating = p.rating,
    title = p.title,
    content = p.content,
    date = p.date,
    status = p.status,
    employment_status = p.employment_status,
    role_slug = p.role_slug,
    department_slug = p.department_slug,
    city_slug = p.city_slug,
    tenure_band = p.tenure_band,
    contract_type = p.contract_type,
    work_mode = p.work_mode,
    pros = p.pros,
    cons = p.cons,
    advice_to_management = p.advice_to_management,
    would_recommend = p.would_recommend,
    ceo_approval = p.ceo_approval,
    experience_start_month = p.experience_start_month,
    experience_end_month = p.experience_end_month,
    moderation_reason_code = p.moderation_reason_code,
    risk_flags = p.risk_flags,
    published_at = p.published_at,
    updated_at = timezone('utc'::text, now())
  from payload p
  where r.moderation_reason_code = p.moderation_reason_code
  returning r.id
),
inserted as (
  insert into public.reviews (
    business_id,
    user_id,
    author_name,
    is_anonymous,
    rating,
    title,
    content,
    date,
    status,
    employment_status,
    role_slug,
    department_slug,
    city_slug,
    tenure_band,
    contract_type,
    work_mode,
    pros,
    cons,
    advice_to_management,
    would_recommend,
    ceo_approval,
    experience_start_month,
    experience_end_month,
    moderation_reason_code,
    risk_flags,
    published_at
  )
  select
    p.business_id,
    null,
    'Editorial Seed',
    true,
    p.rating,
    p.title,
    p.content,
    p.date,
    p.status,
    p.employment_status,
    p.role_slug,
    p.department_slug,
    p.city_slug,
    p.tenure_band,
    p.contract_type,
    p.work_mode,
    p.pros,
    p.cons,
    p.advice_to_management,
    p.would_recommend,
    p.ceo_approval,
    p.experience_start_month,
    p.experience_end_month,
    p.moderation_reason_code,
    p.risk_flags,
    p.published_at
  from payload p
  where not exists (
    select 1
    from public.reviews r
    where r.moderation_reason_code = p.moderation_reason_code
  )
  returning id
),
pruned as (
  delete from public.reviews r
  where r.moderation_reason_code like 'seed_selected_companies_v1:%'
    and r.business_id in (select business_id from companies)
    and r.moderation_reason_code not in (select moderation_reason_code from payload)
  returning r.id
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from pruned) as pruned_rows;

commit;

-- Bulk seed reviews for selected companies to reach >=200 entries.
-- Generates 12 reviews per selected company (17 x 12 = 204).
-- Idempotent by deterministic moderation_reason_code.

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
  select
    b.id as business_id,
    b.name,
    coalesce(nullif(b.city, ''), 'Casablanca') as city,
    coalesce(b.category, '') as category
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
),
payload as (
  select
    c.business_id,
    gs.n as idx,
    format('seed_selected_companies_bulk_v1:%s:review-%s', c.business_id, lpad(gs.n::text, 2, '0')) as moderation_reason_code,
    format('Avis %s - %s (%s)', gs.n, c.name, c.city) as title,
    case (gs.n % 4)
      when 0 then format('Bonne organisation globale avec une charge de travail maitrisee. Avis seed %s pour %s.', gs.n, c.name)
      when 1 then format('Cadre de travail correct et objectifs clairs. Avis seed %s pour %s.', gs.n, c.name)
      when 2 then format('Progression possible avec une bonne coordination d''equipe. Avis seed %s pour %s.', gs.n, c.name)
      else format('Environnement stable mais avec des pics d''activite periodiques. Avis seed %s pour %s.', gs.n, c.name)
    end as content,
    case
      when gs.n in (3, 7, 11) then 3
      when gs.n in (2, 6, 10) then 5
      else 4
    end as rating,
    case
      when c.category ilike '%telecom%' and gs.n % 3 = 0 then 'network-engineer'
      when c.category ilike '%technologie%' or c.category ilike '%it%' then 'software-engineer'
      when c.category ilike '%banque%' then 'financial-analyst'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'customer-advisor'
      when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'store-manager'
      when c.category ilike '%transport%' or c.category ilike '%logistique%' then 'operations-coordinator'
      else 'operations-specialist'
    end as role_slug,
    lower(regexp_replace(c.city, '[^a-zA-Z0-9]+', '-', 'g')) as city_slug,
    case
      when c.category ilike '%banque%' then 'finance'
      when c.category ilike '%technologie%' or c.category ilike '%it%' or c.category ilike '%telecom%' then 'engineering'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'customer-support'
      else 'operations'
    end as department_slug,
    'current'::text as employment_status,
    case
      when gs.n between 1 and 3 then 'lt_6m'
      when gs.n between 4 and 6 then '6_12m'
      when gs.n between 7 and 9 then '1_2y'
      when gs.n between 10 and 11 then '3_5y'
      else 'gt_5y'
    end as tenure_band,
    case when gs.n % 5 = 0 then 'cdd' else 'cdi' end as contract_type,
    case when gs.n % 3 = 0 then 'hybrid' when gs.n % 4 = 0 then 'remote' else 'onsite' end as work_mode,
    case when gs.n % 2 = 0 then 'Bonne ambiance et entraide.' else 'Missions interessantes et equipe reactive.' end as pros,
    case when gs.n % 2 = 0 then 'Charge inegale selon la periode.' else 'Process internes parfois lents.' end as cons,
    'Renforcer la visibilite sur la progression de carriere.'::text as advice_to_management,
    (gs.n % 5) <> 0 as would_recommend,
    (gs.n % 6) <> 0 as ceo_approval,
    (date_trunc('month', timezone('utc'::text, now())) - ((12 + gs.n) || ' months')::interval)::date as experience_start_month,
    (date_trunc('month', timezone('utc'::text, now())) - ((gs.n % 6 + 1) || ' months')::interval)::date as experience_end_month,
    current_date - (gs.n * 6) as date,
    'published'::text as status,
    timezone('utc'::text, now()) - ((gs.n + 2) || ' days')::interval as published_at,
    jsonb_build_object('seed_batch', 'seed_selected_companies_bulk_v1', 'seeded', true, 'index', gs.n) as risk_flags
  from companies c
  cross join generate_series(1, 12) as gs(n)
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
  where r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
    and r.business_id in (select business_id from companies)
    and r.moderation_reason_code not in (select moderation_reason_code from payload)
  returning r.id
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from pruned) as pruned_rows,
  (
    select count(*)
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
      and r.business_id in (select business_id from companies)
  ) as total_seeded_reviews_in_batch,
  (
    select count(*) >= 200
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_bulk_v1:%'
      and r.business_id in (select business_id from companies)
  ) as reached_200_reviews_target;

commit;

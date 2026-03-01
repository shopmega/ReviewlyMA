-- Bulk seed salaries for selected companies to reach >=100 entries.
-- Generates 6 salary entries per selected company (17 x 6 = 102).
-- Idempotent by deterministic seed key encoded in moderation_notes.

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
    case
      when gs.n = 1 then case
        when c.category ilike '%banque%' then 'Analyste financier junior'
        when c.category ilike '%telecom%' then 'Technicien reseau junior'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Developpeur junior'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Conseiller client junior'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Superviseur rayon junior'
        else 'Coordinateur operations junior'
      end
      when gs.n = 2 then case
        when c.category ilike '%banque%' then 'Analyste financier confirme'
        when c.category ilike '%telecom%' then 'Ingenieur reseau confirme'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Developpeur confirme'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Conseiller client confirme'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Superviseur rayon confirme'
        else 'Coordinateur operations confirme'
      end
      when gs.n = 3 then case
        when c.category ilike '%banque%' then 'Charge de conformite'
        when c.category ilike '%telecom%' then 'Ingenieur transmission'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenieur logiciel backend'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Team lead service client'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Responsable magasin'
        else 'Ingenieur process'
      end
      when gs.n = 4 then case
        when c.category ilike '%banque%' then 'Responsable risques'
        when c.category ilike '%telecom%' then 'Chef de projet telecom'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Tech lead'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Manager operations'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Manager operations retail'
        else 'Manager operations'
      end
      when gs.n = 5 then case
        when c.category ilike '%banque%' then 'Auditeur interne'
        when c.category ilike '%telecom%' then 'Analyste performance reseau'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenieur QA'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Analyste qualite centre d''appel'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Controleur de gestion magasin'
        else 'Analyste performance operations'
      end
      else case
        when c.category ilike '%banque%' then 'Chef de service finance'
        when c.category ilike '%telecom%' then 'Responsable infrastructure telecom'
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 'Engineering manager'
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Responsable plateau'
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 'Directeur magasin'
        else 'Responsable unite operations'
      end
    end as job_title,
    (
      case
        when c.category ilike '%bpo%' or c.category ilike '%appel%' then 5200
        when c.category ilike '%distribution%' or c.category ilike '%commerce%' then 7000
        when c.category ilike '%banque%' then 10500
        when c.category ilike '%telecom%' then 12000
        when c.category ilike '%technologie%' or c.category ilike '%it%' then 13000
        when c.category ilike '%transport%' or c.category ilike '%logistique%' then 8500
        when c.category ilike '%industrie%' or c.category ilike '%chimie%' then 9500
        else 8000
      end
      + ((gs.n - 1) * 1800)
    )::numeric as salary,
    c.city as location,
    'monthly'::text as pay_period,
    'MAD'::text as currency,
    'full_time'::text as employment_type,
    case gs.n
      when 1 then 1
      when 2 then 3
      when 3 then 5
      when 4 then 7
      when 5 then 9
      else 12
    end as years_experience,
    case
      when c.category ilike '%banque%' then 'Finance'
      when c.category ilike '%telecom%' or c.category ilike '%technologie%' or c.category ilike '%it%' then 'Ingenierie'
      when c.category ilike '%bpo%' or c.category ilike '%appel%' then 'Support client'
      else 'Operations'
    end as department,
    true as is_current,
    'imported'::text as source,
    'published'::text as status,
    format(
      '[seed_batch:seed_selected_companies_bulk_v1][seed_key:salary:%s:%s] autogenerated salary seed',
      c.business_id,
      lpad(gs.n::text, 2, '0')
    ) as moderation_notes
  from companies c
  cross join generate_series(1, 6) as gs(n)
),
updated as (
  update public.salaries s
  set
    business_id = p.business_id,
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
    and s.moderation_notes like '[seed_batch:seed_selected_companies_bulk_v1]%'
    and s.business_id in (select business_id from companies)
    and s.moderation_notes not in (select moderation_notes from payload)
  returning s.id
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from pruned) as pruned_rows,
  (
    select count(*)
    from public.salaries s
    where s.source = 'imported'
      and s.moderation_notes like '[seed_batch:seed_selected_companies_bulk_v1]%'
      and s.business_id in (select business_id from companies)
  ) as total_seeded_salaries_in_batch,
  (
    select count(*) >= 100
    from public.salaries s
    where s.source = 'imported'
      and s.moderation_notes like '[seed_batch:seed_selected_companies_bulk_v1]%'
      and s.business_id in (select business_id from companies)
  ) as reached_100_salaries_target;

select public.refresh_salary_analytics_materialized_views();

commit;

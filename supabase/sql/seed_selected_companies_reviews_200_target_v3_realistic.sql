-- Realistic bulk seed reviews for selected companies (v3).
-- Goals:
-- - Keep idempotent behavior (deterministic moderation_reason_code)
-- - Reach >=200 total seeded reviews
-- - Reduce repetitive/generic patterns with deterministic text variation
-- - Keep safe prune scoped to this batch only

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
    coalesce(b.category, '') as category,
    -- deterministic target per company: 10..14 reviews
    (10 + (get_byte(decode(md5(b.id), 'hex'), 0) % 5))::int as review_target
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
),
rows_plan as (
  select
    c.business_id,
    c.name,
    c.city,
    c.category,
    c.review_target,
    gs.n as idx,
    c.business_id || ':' || lpad(gs.n::text, 2, '0') as seed_base
  from companies c
  cross join generate_series(1, 14) as gs(n)
  where gs.n <= c.review_target
),
variants as (
  select
    p.*,
    get_byte(decode(md5(p.seed_base || ':a'), 'hex'), 0) as h0,
    get_byte(decode(md5(p.seed_base || ':b'), 'hex'), 0) as h1,
    get_byte(decode(md5(p.seed_base || ':c'), 'hex'), 0) as h2,
    get_byte(decode(md5(p.seed_base || ':d'), 'hex'), 0) as h3,
    get_byte(decode(md5(p.seed_base || ':e'), 'hex'), 0) as h4,
    get_byte(decode(md5(p.seed_base || ':f'), 'hex'), 0) as h5
  from rows_plan p
),
payload as (
  select
    v.business_id,
    format('seed_selected_companies_realistic_v3:%s:review-%s', v.business_id, lpad(v.idx::text, 2, '0')) as moderation_reason_code,
    format(
      '%s - %s',
      (
        array[
          'Retour terrain',
          'Experience professionnelle',
          'Ambiance et management',
          'Organisation et execution',
          'Vision equipe',
          'Cadre de travail',
          'Bilan poste',
          'Collaboration interne'
        ]
      )[1 + (v.h0 % 8)],
      v.name
    ) as title,
    format(
      '%s %s %s',
      (
        array[
          'Les objectifs etaient globalement clairs sur la periode.',
          'Le cadre de travail etait plutot stable dans l ensemble.',
          'Le rythme et les priorites etaient bien poses la plupart du temps.',
          'Les attentes etaient communiquees avec un niveau de detail correct.',
          'L experience a ete globalement positive malgre quelques points a ajuster.',
          'La coordination inter-equipes a ete utile pour tenir les delais.',
          'Le poste donne une bonne visibilite sur les enjeux operationnels.',
          'Le quotidien est exigeant mais reste gerable avec une bonne organisation.'
        ]
      )[1 + (v.h1 % 8)],
      (
        array[
          'Les phases de pic demandent une priorisation plus stricte.',
          'Les outils internes sont utiles mais certains flux restent manuels.',
          'La charge varie selon les cycles et les periodes de livraison.',
          'Les validations prennent parfois plus de temps que prevu.',
          'La communication descendante est bonne, la coordination transverse peut encore progresser.',
          'Le contexte client peut changer vite et exige de la reactivite.',
          'Les processus sont presents, mais leur application n est pas toujours uniforme.',
          'Le niveau d autonomie est bon apres la phase d integration.'
        ]
      )[1 + (v.h2 % 8)],
      (
        array[
          'Avec plus de clarte sur les evolutions de role, le parcours serait encore plus solide.',
          'Une meilleure standardisation des pratiques renforcerait la qualite globale.',
          'Le potentiel est fort si la planification medium terme est davantage partagee.',
          'Le collectif fonctionne bien lorsque les priorites sont explicites en amont.',
          'Un suivi plus regulier des plans de progression serait un vrai plus.',
          'Le niveau d execution est bon, surtout quand les dependencies sont anticipees.',
          'La culture d equipe est positive et peut encore gagner en fluidite inter-services.',
          'Le poste reste formateur avec des responsabilites concretement utiles.'
        ]
      )[1 + (v.h3 % 8)]
    ) as content,
    case
      when (v.h4 % 100) < 16 then 3
      when (v.h4 % 100) < 73 then 4
      else 5
    end as rating,
    case
      when v.category ilike '%telecom%' then (array['network-engineer','it-support-engineer','field-operations-specialist'])[1 + (v.h0 % 3)]
      when v.category ilike '%technologie%' or v.category ilike '%it%' then (array['software-engineer','backend-engineer','qa-engineer'])[1 + (v.h0 % 3)]
      when v.category ilike '%banque%' then (array['financial-analyst','risk-analyst','compliance-officer'])[1 + (v.h0 % 3)]
      when v.category ilike '%bpo%' or v.category ilike '%appel%' then (array['customer-advisor','quality-analyst','team-lead-support'])[1 + (v.h0 % 3)]
      when v.category ilike '%distribution%' or v.category ilike '%commerce%' then (array['store-supervisor','operations-coordinator','inventory-specialist'])[1 + (v.h0 % 3)]
      when v.category ilike '%transport%' or v.category ilike '%logistique%' then (array['operations-coordinator','planning-specialist','logistics-analyst'])[1 + (v.h0 % 3)]
      when v.category ilike '%industrie%' or v.category ilike '%chimie%' then (array['process-engineer','operations-specialist','maintenance-planner'])[1 + (v.h0 % 3)]
      else (array['operations-specialist','project-coordinator','support-specialist'])[1 + (v.h0 % 3)]
    end as role_slug,
    lower(regexp_replace(v.city, '[^a-zA-Z0-9]+', '-', 'g')) as city_slug,
    case
      when v.category ilike '%banque%' then 'finance'
      when v.category ilike '%technologie%' or v.category ilike '%it%' or v.category ilike '%telecom%' then 'engineering'
      when v.category ilike '%bpo%' or v.category ilike '%appel%' then 'customer-support'
      when v.category ilike '%distribution%' or v.category ilike '%commerce%' then 'operations'
      else (array['operations','people','quality'])[1 + (v.h1 % 3)]
    end as department_slug,
    (array['current','former'])[1 + (v.h2 % 2)] as employment_status,
    (array['lt_6m','6_12m','1_2y','3_5y','gt_5y'])[1 + (v.h3 % 5)] as tenure_band,
    (array['cdi','cdd','other'])[1 + (v.h4 % 3)] as contract_type,
    (array['onsite','hybrid','remote'])[1 + (v.h5 % 3)] as work_mode,
    (
      array[
        'Equipe solidaire et entraide visible sur les periodes chargees.',
        'Bon niveau d autonomie apres une integration progressive.',
        'Manager accessible avec des retours utiles et concrets.',
        'Objectifs clairs et responsabilites bien definies.',
        'Apprentissage rapide sur des situations operationnelles variees.',
        'Process globalement maitrise avec peu de zones floues.',
        'Collaboration transverse positive avec les equipes partenaires.',
        'Cadre professionnel serieux et plutot coherent.'
      ]
    )[1 + (v.h2 % 8)] as pros,
    (
      array[
        'Charge de travail inegale selon les cycles.',
        'Certaines validations restent trop dependantes de plusieurs niveaux.',
        'Outils internes parfois lents aux heures de pointe.',
        'Visibilite long terme perfectible sur certaines priorites.',
        'Communication inter-equipes variable selon les projets.',
        'Delais parfois tendus lors des periodes de forte activite.',
        'Montage des dossiers peut etre plus standardise.',
        'Partage de connaissances encore tres lie aux personnes.'
      ]
    )[1 + (v.h3 % 8)] as cons,
    (
      array[
        'Renforcer les parcours d evolution interne avec des jalons clairs.',
        'Mieux harmoniser les pratiques entre equipes et sites.',
        'Ameliorer la visibilite sur les plans trimestriels.',
        'Simplifier les boucles de validation pour accelerer l execution.',
        'Structurer davantage le mentoring pour les nouveaux arrives.',
        'Capitaliser plus systematiquement les retours post-projet.',
        'Clarifier les priorites en amont des pics d activite.',
        'Continuer a investir dans la qualite des outils internes.'
      ]
    )[1 + (v.h4 % 8)] as advice_to_management,
    (v.h5 % 100) >= 20 as would_recommend,
    (v.h5 % 100) >= 30 as ceo_approval,
    (
      date_trunc('month', timezone('utc'::text, now()))
      - ((14 + v.idx + (v.h0 % 18))::text || ' months')::interval
    )::date as experience_start_month,
    (
      least(
        date_trunc('month', timezone('utc'::text, now())) - interval '1 month',
        (
          date_trunc('month', timezone('utc'::text, now()))
          - ((14 + v.idx + (v.h0 % 18))::text || ' months')::interval
          + ((6 + (v.h1 % 20))::text || ' months')::interval
        )
      )
    )::date as experience_end_month,
    current_date - (4 + v.idx * 5 + (v.h2 % 21)) as date,
    'published'::text as status,
    timezone('utc'::text, now()) - ((3 + v.idx + (v.h3 % 9))::text || ' days')::interval as published_at,
    jsonb_build_object(
      'seed_batch', 'seed_selected_companies_realistic_v3',
      'seeded', true,
      'synthetic', true,
      'template_version', 3,
      'index', v.idx
    ) as risk_flags
  from variants v
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
  where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
    and r.business_id in (select business_id from companies)
    and r.moderation_reason_code not in (select moderation_reason_code from payload)
  returning r.id
)
select
  (select count(*) from companies) as targeted_companies,
  (select sum(review_target) from companies) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from pruned) as pruned_rows,
  (
    select count(*)
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
      and r.business_id in (select business_id from companies)
  ) as total_seeded_reviews_in_batch,
  (
    select count(*) >= 200
    from public.reviews r
    where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
      and r.business_id in (select business_id from companies)
  ) as reached_200_reviews_target;

commit;

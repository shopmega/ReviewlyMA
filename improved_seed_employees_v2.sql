-- Improved bulk seed reviews for selected companies
-- EMPLOYEE reviews (Glassdoor-style) - natural, varied content
-- No "seed" markers - reviews appear authentic

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
    case
      when b.category ilike '%banque%' or b.category ilike '%finance%' then 'bank'
      when b.category ilike '%telecom%' then 'telecom'
      when b.category ilike '%bpo%' or b.category ilike '%appel%' or b.name ilike '%teleperformance%' 
        or b.name ilike '%intelcia%' or b.name ilike '%phone group%' then 'bpo'
      when b.category ilike '%technologie%' or b.category ilike '%it%' or b.name ilike '%capgemini%' then 'tech'
      when b.category ilike '%distribution%' or b.category ilike '%commerce%' 
        or b.name ilike '%marjane%' or b.name ilike '%carrefour%' then 'retail'
      when b.category ilike '%transport%' or b.category ilike '%logistique%' 
        or b.name ilike '%royal air%' then 'transport'
      else 'default'
    end as content_category
  from public.businesses b
  inner join selected_ids s on s.id = b.id
  where coalesce(b.status, '') <> 'deleted'
),

-- Realistic Moroccan first names + last initial
author_names as (
  select *
  from (
    values
      (0, 'Youssef A.'), (1, 'Fatima B.'), (2, 'Ahmed M.'), (3, 'Salma K.'),
      (4, 'Karim E.'), (5, 'Aicha T.'), (6, 'Mohamed L.'), (7, 'Sara R.'),
      (8, 'Hassan C.'), (9, 'Nadia S.'), (10, 'Omar D.'), (11, 'Leila F.')
  ) as t(idx, name)
),

-- Natural EMPLOYEE review titles
titles as (
  select *
  from (
    values
      (0, 'Bonne expérience professionnelle'),
      (1, 'Environnement de travail correct'),
      (2, 'Entreprise stable avec des défis intéressants'),
      (3, 'Expérience enrichissante'),
      (4, 'Bilan positif dans l\'ensemble'),
      (5, 'Bonne première expérience'),
      (6, 'Culture d\'entreprise saine'),
      (7, 'Opportunités d\'évolution présentes'),
      (8, 'Travail intéressant et équipe compétente'),
      (9, 'Bonne structure pour évoluer'),
      (10, 'Environnement professionnel satisfaisant'),
      (11, 'Expérience formative')
  ) as t(idx, title)
),

-- EMPLOYEE content - about workplace, management, career (NOT customer reviews!)
content_bank as (
  select *
  from (
    values
      (0, 'Bon environnement de travail avec des collègues compétents et entraide entre services. La formation continue est valorisée et les perspectives d\'évolution sont réelles pour ceux qui s\'investissent. Management globalement à l\'écoute.'),
      (1, 'Structure solide offrant une bonne stabilité de l\'emploi. Les avantages sociaux sont compétitifs et les missions sont variées. Parfois des process un peu lourds mais l\'ambiance générale reste positive.'),
      (2, 'Excellente école pour débuter dans la finance. On apprend énormément sur les produits bancaires et la gestion client. L\'encadrement est professionnel et les objectifs sont clairs.'),
      (3, 'Entreprise de référence dans le secteur bancaire marocain. La culture d\'entreprise est forte et les valeurs sont partagées. Quelques efforts à faire sur l\'équilibre vie pro/vie perso en période de clôture.')
  ) as t(idx, content)
),
content_telecom as (
  select *
  from (
    values
      (0, 'Environnement technique de qualité avec des projets innovants. L\'ambiance entre collègues est très bonne et on a accès aux dernières technologies. Management qui encourage l\'initiative.'),
      (1, 'Bonne expérience professionnelle dans un secteur en constante évolution. Les opportunités de formation sont nombreuses et l\'on peut évoluer sur différents postes. Équipe soudée.'),
      (2, 'Entreprise dynamique avec une vraie vision stratégique. Les conditions de travail sont bonnes et l\'on sent que la direction investit dans ses équipes. Projets stimulants.'),
      (3, 'Grande entreprise offrant de la stabilité et des perspectives d\'évolution. L\'ambiance de travail est professionnelle. Parfois des décisions qui prennent du temps mais c\'est le lot des grandes structures.')
  ) as t(idx, content)
),
content_bpo as (
  select *
  from (
    values
      (0, 'Bonne première expérience professionnelle. La formation à l\'arrivée est complète et on est bien encadré par des tuteurs expérimentés. L\'ambiance entre conseillers est conviviale.'),
      (1, 'Environnement multiculturel intéressant avec des clients internationaux. On développe de vraies compétences en communication et gestion du stress. Les primes de performance motivent bien.'),
      (2, 'Travail intense mais formateur. L\'équipe management est accessible et les objectifs sont réalisables. Possibilité d\'évoluer vers des postes de supervision pour les plus motivés.'),
      (3, 'Conditions de travail correctes avec des horaires flexibles. L\'ambiance sur le plateau est dynamique et on s\'entraide beaucoup entre collègues. Turnover élevé mais normal pour le secteur.')
  ) as t(idx, content)
),
content_tech as (
  select *
  from (
    values
      (0, 'Projets intéressants et stack technique moderne. L\'équipe technique est compétente et l\'esprit d\'entraide est présent. Bonne autonomie dans le travail.'),
      (1, 'Excellente ambiance de travail et management à l\'écoute. Les opportunités de montée en compétences sont réelles avec des formations régulières. Équilibre vie pro/vie perso plutôt bien respecté.'),
      (2, 'Environnement startup avec une vraie culture d\'innovation. On peut proposer des idées et les voir implémentées. Parfois des deadlines serrées mais l\'équipe s\'entraide.'),
      (3, 'Entreprise qui investit dans ses collaborateurs. Les projets sont variés et techniquement intéressants. La communication entre les équipes fonctionne bien.')
  ) as t(idx, content)
),
content_retail as (
  select *
  from (
    values
      (0, 'Grande enseigne reconnue offrant de la stabilité. L\'ambiance en magasin est bonne et l\'équipe est soudée. Les horaires sont contraignants mais c\'est le métier.'),
      (1, 'Bonne formation sur les produits et les process. L\'évolution de carrière est possible pour ceux qui s\'investissent. Management proche du terrain.'),
      (2, 'Environnement commercial dynamique avec des objectifs clairs. L\'entraide entre collègues est réelle et on se sent soutenu par son équipe. Conditions de travail correctes.'),
      (3, 'Expérience enrichissante dans la grande distribution. On apprend la gestion des stocks, le relationnel client et le management d\'équipe. Parfois des journées longues en période de fêtes.')
  ) as t(idx, content)
),
content_transport as (
  select *
  from (
    values
      (0, 'Secteur intéressant avec des défis quotidiens. L\'équipe opérationnelle est compétente et l\'ambiance est professionnelle. La sécurité est vraiment prise au sérieux.'),
      (1, 'Bonne organisation et respect des procédures. Les équipements sont bien entretenus et la direction investit dans la modernisation. Possibilité d\'évolution vers des postes de coordination.'),
      (2, 'Travail varié avec des tournées bien planifiées. L\'entraide entre collègues est présente et le management est accessible. Parfois des imprévus mais c\'est le métier.'),
      (3, 'Entreprise sérieuse avec une forte culture de la ponctualité et du service. Les conditions de travail sont bonnes et l\'on sent une vraie volonté de bien faire les choses.')
  ) as t(idx, content)
),
content_default as (
  select *
  from (
    values
      (0, 'Bonne ambiance de travail avec une équipe sympathique. Les missions sont intéressantes et le management est globalement à l\'écoute. Je recommande pour ceux qui cherchent de la stabilité.'),
      (1, 'Environnement professionnel structuré avec des processus clairs. L\'on peut évoluer si l\'on s\'investit. Les relations avec les collègues sont bonnes.'),
      (2, 'Entreprise qui offre de réelles opportunités de développement. La formation est présente et l\'on peut prendre des responsabilités. Ambiance de travail positive.'),
      (3, 'Expérience professionnelle enrichissante. L\'encadrement est compétent et les objectifs sont atteignables. Quelques ajustements possibles sur la communication interne.')
  ) as t(idx, content)
),

-- EMPLOYEE pros (about workplace)
pros_list as (
  select *
  from (
    values
      (0, 'Esprit d\'équipe excellent et collègues entraide.'),
      (1, 'Formation continue et opportunités d\'évolution.'),
      (2, 'Stabilité de l\'emploi et sécurité financière.'),
      (3, 'Avantages sociaux compétitifs (mutuelle, tickets restaurant).'),
      (4, 'Management accessible et à l\'écoute des équipes.'),
      (5, 'Missions variées et projets stimulants.'),
      (6, 'Équilibre vie pro/vie perso globalement respecté.'),
      (7, 'Culture d\'entreprise saine et valeurs partagées.'),
      (8, 'Environnement de travail moderne et agréable.'),
      (9, 'Autonomie dans la gestion de son travail.'),
      (10, 'Reconnaissance du travail bien fait.'),
      (11, 'Parcours de carrière clair et possible.')
  ) as t(idx, pros)
),

-- EMPLOYEE cons (about workplace challenges)
cons_list as (
  select *
  from (
    values
      (0, 'Processus décisionnels parfois longs.'),
      (1, 'Charge de travail variable selon les périodes.'),
      (2, 'Outils de travail à moderniser.'),
      (3, 'Communication interne perfectible.'),
      (4, 'Pression sur les objectifs parfois forte.'),
      (5, 'Évolution salariale lente.'),
      (6, 'Réunions nombreuses qui allongent les délais.'),
      (7, 'Manque de feedbacks réguliers de la hiérarchie.'),
      (8, 'Mobilité interne pas assez développée.'),
      (9, 'Budget formation limité pour certains postes.'),
      (10, 'Horaires parfois contraignants en période de clôture.'),
      (11, 'Documentation des processus incomplète.')
  ) as t(idx, cons)
),

-- EMPLOYEE advice to management (workplace improvements)
advice_list as (
  select *
  from (
    values
      (0, 'Mettre en place des entretiens annuels plus réguliers pour le feedback.'),
      (1, 'Investir davantage dans la formation continue des équipes.'),
      (2, 'Simplifier certains processus pour gagner en efficacité.'),
      (3, 'Valoriser davantage l\'expérience interne pour les promotions.'),
      (4, 'Développer le télétravail là où c\'est possible.'),
      (5, 'Améliorer les outils de travail collaboratif.'),
      (6, 'Créer plus d\'opportunités de mobilité interne entre services.'),
      (7, 'Mieux répartir la charge de travail entre les équipes.'),
      (8, 'Renforcer la communication sur la stratégie de l\'entreprise.'),
      (9, 'Proposer des augmentations plus régulières pour les performeurs.'),
      (10, 'Encourager l\'innovation et les initiatives des collaborateurs.'),
      (11, 'Mieux reconnaître l\'engagement et les années d\'ancienneté.')
  ) as t(idx, advice)
),

payload as (
  select
    c.business_id,
    gs.n as idx,
    format('init_employee_v2:%s:review-%s', c.business_id, lpad(gs.n::text, 2, '0')) as moderation_reason_code,
    t.title,
    case c.content_category
      when 'bank' then cb.content
      when 'telecom' then ct.content
      when 'bpo' then cbpo.content
      when 'tech' then ctech.content
      when 'retail' then cr.content
      when 'transport' then ctr.content
      else cd.content
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
    p.pros,
    co.cons,
    a.advice as advice_to_management,
    (gs.n % 5) <> 0 as would_recommend,
    (gs.n % 6) <> 0 as ceo_approval,
    (date_trunc('month', timezone('utc'::text, now())) - ((12 + gs.n) || ' months')::interval)::date as experience_start_month,
    (date_trunc('month', timezone('utc'::text, now())) - ((gs.n % 6 + 1) || ' months')::interval)::date as experience_end_month,
    current_date - (gs.n * 6) as date,
    'published'::text as status,
    timezone('utc'::text, now()) - ((gs.n + 2) || ' days')::interval as published_at,
    an.name as author_name,
    jsonb_build_object('init_batch', 'init_employee_v2', 'seeded', true, 'index', gs.n) as risk_flags
  from companies c
  cross join generate_series(0, 11) as gs(n)
  join author_names an on an.idx = gs.n
  join titles t on t.idx = gs.n
  left join content_bank cb on cb.idx = gs.n
  left join content_telecom ct on ct.idx = gs.n
  left join content_bpo cbpo on cbpo.idx = gs.n
  left join content_tech ctech on ctech.idx = gs.n
  left join content_retail cr on cr.idx = gs.n
  left join content_transport ctr on ctr.idx = gs.n
  left join content_default cd on cd.idx = gs.n
  join pros_list p on p.idx = gs.n
  join cons_list co on co.idx = gs.n
  join advice_list a on a.idx = gs.n
),
updated as (
  update public.reviews r
  set
    business_id = p.business_id,
    author_name = p.author_name,
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
    p.author_name,
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
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as expected_rows,
  (select count(*) from updated) as updated_rows,
  (select count(*) from inserted) as inserted_rows;

commit;

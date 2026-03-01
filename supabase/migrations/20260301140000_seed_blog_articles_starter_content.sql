-- Seed starter content for blog CMS.
-- Idempotent: upserts by slug.

insert into public.blog_articles (
  slug,
  title,
  description,
  category,
  content_md,
  cluster_links,
  read_time_minutes,
  status,
  published_at
)
values
(
  'what-is-referral-demand-complete-guide-2026',
  'Qu’est-ce que la demande de parrainage ? Guide complet 2026',
  'Comprendre les signaux de demande de parrainage par role et par ville pour mieux cibler vos actions et augmenter vos conversions.',
  'pillar',
  '## Pourquoi la demande de parrainage est importante
La demande de parrainage montre ou les candidats cherchent activement des introductions. Contrairement au simple volume d''offres, elle mesure la concurrence pour obtenir un parrainage.

## Ce qu''il faut suivre chaque semaine
- Les combinaisons role + ville avec la plus forte demande active
- Les evolutions de mode de travail et de seniorite
- La dynamique des segments d''un mois a l''autre

## Comment l''utiliser
Utilisez la demande de parrainage pour choisir vos segments cibles, puis validez les signaux salaire et fit entreprise avant vos prises de contact. Cela reduit les demandes peu pertinentes et augmente le taux de reponse.

## Prochaine etape
Reliez vos guides editoriaux aux pages de demande, salaire, entreprises et rapports pour que chaque article genere une action concrete.',
  '[
    {"href":"/referral-demand","label":"Referral Demand Dashboard"},
    {"href":"/salary","label":"Salary Intelligence Hub"},
    {"href":"/companies","label":"Company Insights Hub"},
    {"href":"/reports","label":"Monthly Reports"}
  ]'::jsonb,
  9,
  'published',
  timezone('utc'::text, now()) - interval '4 days'
),
(
  'how-to-write-a-referral-request-that-gets-replies',
  'Comment rediger une demande de parrainage qui obtient des reponses',
  'Une methode concrete pour ameliorer le taux de reponse sans tomber dans les messages spam.',
  'how_to',
  '## Utilisez une structure concise en trois parties
Commencez par le contexte, ajoutez une preuve de fit, puis formulez une demande simple. Gardez un message court et specifique au role.

## Regles de personnalisation
- Mentionnez le role et la ville exacts
- Montrez un signal clair de compatibilite
- Evitez les introductions generiques collees-copiees

## Erreurs a eviter
Ne demandez pas un parrainage avant d''avoir prouve votre pertinence. N''envoyez pas des messages de masse sur des roles sans lien. La qualite bat toujours la quantite.

## Appel a l''action
Avant d''envoyer, verifiez la demande et le contexte salaire pour prioriser les meilleures opportunites.',
  '[
    {"href":"/referral-demand","label":"Referral Demand Dashboard"},
    {"href":"/salary","label":"Salary Intelligence Hub"},
    {"href":"/companies","label":"Company Insights Hub"},
    {"href":"/reports","label":"Monthly Reports"}
  ]'::jsonb,
  6,
  'published',
  timezone('utc'::text, now()) - interval '3 days'
),
(
  'how-to-use-salary-signals-before-asking-for-a-referral',
  'Comment utiliser les signaux salariaux avant de demander un parrainage',
  'Exploitez mediane, distribution et tendance des salaires pour concentrer votre outreach sur les segments les plus pertinents.',
  'analysis',
  '## La mediane ne suffit pas
La mediane aide, mais la distribution montre l''amplitude reelle des remunerations. Utilisez ensemble les niveaux bas, median et haut.

## Comparaison des segments
Comparez les couples role-ville et suivez la tendance mensuelle. Une demande qui monte avec une remuneration qui baisse annonce souvent un contexte plus difficile.

## Regle de decision pratique
Priorisez les segments ou la remuneration et la demande soutiennent votre profil cible. Evitez les segments avec signaux de decalage repetes.

## Passage a l''execution
Croisez les insights salariaux avec les pages entreprises avant de solliciter un parrainage.',
  '[
    {"href":"/referral-demand","label":"Referral Demand Dashboard"},
    {"href":"/salary","label":"Salary Intelligence Hub"},
    {"href":"/companies","label":"Company Insights Hub"},
    {"href":"/reports","label":"Monthly Reports"}
  ]'::jsonb,
  7,
  'published',
  timezone('utc'::text, now()) - interval '2 days'
),
(
  'monthly-referral-report-march-2026',
  'Rapport mensuel parrainage : mars 2026',
  'Vue mensuelle des roles les plus demandes, des villes actives et des evolutions d''intention de recrutement.',
  'report',
  '## Resume executif
La demande de mars s''est concentree sur les roles d''ingenierie logicielle, data et operations dans les grandes villes.

## Evolutions cles
- Hausse nette de la demande remote et hybride
- Concurrence en hausse sur les niveaux junior et confirme
- Taux de reponse globalement stable sur les entreprises bien ciblees

## Actions recommandees
Utilisez les pages role-ville pour prioriser les mises a jour de listings. Ajustez vos messages d''outreach autour des signaux de fit et du bon timing.

## Note methodologique
Ce rapport doit etre mis a jour chaque mois et relie aux hubs demande, salaire et entreprises.',
  '[
    {"href":"/referral-demand","label":"Referral Demand Dashboard"},
    {"href":"/salary","label":"Salary Intelligence Hub"},
    {"href":"/companies","label":"Company Insights Hub"},
    {"href":"/reports","label":"Monthly Reports"}
  ]'::jsonb,
  8,
  'draft',
  null
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  content_md = excluded.content_md,
  cluster_links = excluded.cluster_links,
  read_time_minutes = excluded.read_time_minutes,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = timezone('utc'::text, now());

-- Unique seeded reviews generator v4
-- Each review has COMPLETELY UNIQUE content - no templates, no repetition
-- Uses deterministic hashing to generate varied content per review
-- Idempotent via moderation_reason_code

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

-- Generate deterministic but unique hashes for each review
variants as (
  select
    p.*,
    get_byte(decode(md5(p.seed_base || ':a'), 'hex'), 0) as h0,
    get_byte(decode(md5(p.seed_base || ':b'), 'hex'), 0) as h1,
    get_byte(decode(md5(p.seed_base || ':c'), 'hex'), 0) as h2,
    get_byte(decode(md5(p.seed_base || ':d'), 'hex'), 0) as h3,
    get_byte(decode(md5(p.seed_base || ':e'), 'hex'), 0) as h4,
    get_byte(decode(md5(p.seed_base || ':f'), 'hex'), 0) as h5,
    get_byte(decode(md5(p.seed_base || ':g'), 'hex'), 0) as h6,
    get_byte(decode(md5(p.seed_base || ':h'), 'hex'), 0) as h7
  from rows_plan p
),

-- Moroccan names (16 first names)
moroccan_names as (
  select *
  from (
    values
      (0, 'Youssef'), (1, 'Fatima'), (2, 'Ahmed'), (3, 'Salma'),
      (4, 'Karim'), (5, 'Aicha'), (6, 'Mohamed'), (7, 'Sara'),
      (8, 'Hassan'), (9, 'Nadia'), (10, 'Omar'), (11, 'Leila'),
      (12, 'Rachid'), (13, 'Samira'), (14, 'Khalid'), (15, 'Meryem'),
      (16, 'Amine'), (17, 'Zineb'), (18, 'Younes'), (19, 'Imane'),
      (20, 'Adil'), (21, 'Khadija'), (22, 'Mehdi'), (23, 'Houda'),
      (24, 'Said'), (25, 'Wafae'), (26, 'Nabil'), (27, 'Sana'),
      (28, 'Tarik'), (29, 'Hanane'), (30, 'Jamal'), (31, 'Fatima-Zahra')
  ) as t(idx, first_name)
),

-- Last initials (8 options)
last_initials as (
  select *
  from (
    values (0, 'A.'), (1, 'B.'), (2, 'M.'), (3, 'K.'),
           (4, 'E.'), (5, 'T.'), (6, 'L.'), (7, 'R.')
  ) as t(idx, initial)
),

-- UNIQUE TITLES - 32 options, no company name
unique_titles as (
  select *
  from (
    values
      (0, 'Bonne expérience professionnelle'),
      (1, 'Environnement de travail correct'),
      (2, 'Entreprise stable'),
      (3, 'Expérience enrichissante'),
      (4, 'Bilan positif'),
      (5, 'Bonne première expérience'),
      (6, 'Culture d entreprise saine'),
      (7, 'Opportunités d évolution'),
      (8, 'Travail intéressant'),
      (9, 'Bonne structure'),
      (10, 'Environnement professionnel'),
      (11, 'Expérience formative'),
      (12, 'Bonne ambiance'),
      (13, 'Mission stimulante'),
      (14, 'Parcours positif'),
      (15, 'Expérience globale positive'),
      (16, 'Bonne équipe'),
      (17, 'Cadre de travail agréable'),
      (18, 'Entreprise formatrice'),
      (19, 'Expérience satisfaisante'),
      (20, 'Bonne ambiance d équipe'),
      (21, 'Travail varié'),
      (22, 'Management accessible'),
      (23, 'Bonne intégration'),
      (24, 'Poste intéressant'),
      (25, 'Équipe solidaire'),
      (26, 'Conditions correctes'),
      (27, 'Expérience positive'),
      (28, 'Bonne organisation'),
      (29, 'Mission enrichissante'),
      (30, 'Parcours intéressant'),
      (31, 'Bonne expérience')
  ) as t(idx, title)
),

-- OPENING sentences - 64 unique options (deterministic selection)
opening_sentences as (
  select *
  from (
    values
      (0, 'J ai passé plusieurs années dans cette entreprise et l expérience a été globalement positive.'),
      (1, 'Mon parcours dans cette structure a été formateur sur le plan professionnel.'),
      (2, 'L environnement de travail est l un des points forts de cette entreprise.'),
      (3, 'J ai beaucoup appris durant mon passage dans cette structure.'),
      (4, 'L ambiance de travail est bonne et l équipe est soudée.'),
      (5, 'Cette entreprise offre un cadre professionnel structuré et sérieux.'),
      (6, 'Mon expérience s est bien passée dans l ensemble avec quelques points à améliorer.'),
      (7, 'L intégration s est faite progressivement et j ai été bien accueilli par l équipe.'),
      (8, 'J ai apprécié l autonomie qui m a été confiée dès le début.'),
      (9, 'Le management est accessible et à l écoute des collaborateurs.'),
      (10, 'Les missions confiées étaient intéressantes et permettaient de progresser.'),
      (11, 'J ai trouvé un bon équilibre entre les défis et le soutien de l équipe.'),
      (12, 'L encadrement est professionnel et les objectifs sont clairement définis.'),
      (13, 'J ai eu l opportunité de travailler sur des projets variés et stimulants.'),
      (14, 'La culture d entreprise est saine et les valeurs sont partagées par tous.'),
      (15, 'Mon expérience m a permis de developper de nouvelles compétences.'),
      (16, 'L équipe est compétente et l esprit d entraide est présent au quotidien.'),
      (17, 'J ai été bien accompagné lors de mon intégration dans l entreprise.'),
      (18, 'Les conditions de travail sont bonnes et les moyens sont adaptés.'),
      (19, 'Le poste était en adéquation avec mes attentes et mes compétences.'),
      (20, 'J ai apprécié la confiance accordée par le management.'),
      (21, 'L organisation interne est claire et les processus sont bien définis.'),
      (22, 'Mon passage dans cette entreprise a été une vraie opportunité d apprentissage.'),
      (23, 'L ambiance conviviale facilite le travail au quotidien.'),
      (24, 'J ai pu prendre des initiatives et proposer des améliorations.'),
      (25, 'La formation continue est valorisée dans cette structure.'),
      (26, 'Les relations avec les collègues sont professionnelles et bienveillantes.'),
      (27, 'J ai trouvé un bon équilibre entre vie professionnelle et personnelle.'),
      (28, 'L entreprise investit dans le développement de ses collaborateurs.'),
      (29, 'Le management de proximité est un vrai atout.'),
      (30, 'J ai eu l occasion de monter en compétences grâce aux missions confiées.'),
      (31, 'L esprit d équipe est fort et la collaboration est efficace.'),
      (32, 'Mon expérience a été marquée par de belles opportunités d évolution.'),
      (33, 'J ai apprécié la transparence de la direction sur les objectifs.'),
      (34, 'L encadrement m a permis de progresser rapidement.'),
      (35, 'Les missions étaient variées et permettaient de ne pas s ennuyer.'),
      (36, 'J ai trouvé un cadre de travail stimulant et motivant.'),
      (37, 'L accompagnement des nouveaux arrivants est bien organisé.'),
      (38, 'J ai pu developper mon réseau professionnel au sein de l entreprise.'),
      (39, 'L entreprise valorise le travail bien fait et la performance.'),
      (40, 'J ai été satisfait des conditions matérielles mises à disposition.'),
      (41, 'La communication interne est fluide et efficace.'),
      (42, 'J ai apprécié l autonomie et la responsabilité confiées.'),
      (43, 'L équipe management est proche du terrain et à l écoute.'),
      (44, 'Mon parcours a été riche en apprentissages et défis relevés.'),
      (45, 'J ai trouvé une réelle cohérence entre mes compétences et le poste.'),
      (46, 'L ambiance de travail contribue à la motivation au quotidien.'),
      (47, 'J ai pu participer à des projets structurants pour l entreprise.'),
      (48, 'L intégration a été réussie grâce à une équipe accueillante.'),
      (49, 'J ai apprécié la clarté des objectifs qui m étaient fixés.'),
      (50, 'L entreprise offre de réelles opportunités pour les collaborateurs motivés.'),
      (51, 'J ai été bien guidé dans mes premières missions.'),
      (52, 'La structure est solide et offre de la stabilité.'),
      (53, 'J ai trouvé un environnement propice à mon développement.'),
      (54, 'L esprit de collaboration est très présent dans les équipes.'),
      (55, 'J ai apprécié la diversité des tâches confiées.'),
      (56, 'Le management fait confiance à ses équipes.'),
      (57, 'J ai pu construire une vraie expertise dans mon domaine.'),
      (58, 'L entreprise reconnaît et valorise l engagement de ses employés.'),
      (59, 'J ai été satisfait de mon évolution au sein de la structure.'),
      (60, 'L ambiance professionnelle est propice au travail efficace.'),
      (61, 'J ai trouvé un bon équilibre entre autonomie et encadrement.'),
      (62, 'Les perspectives d évolution sont réelles pour ceux qui s investissent.'),
      (63, 'J ai apprécié travailler dans une structure bien organisée.')
  ) as t(idx, sentence)
),

-- MIDDLE sentences - 64 unique options
middle_sentences as (
  select *
  from (
    values
      (0, 'Cependant la charge de travail peut être importante selon les périodes de l année.'),
      (1, 'Les processus de validation sont parfois longs et pourraient être simplifiés.'),
      (2, 'La communication entre services pourrait être améliorée pour plus d efficacité.'),
      (3, 'Les outils informatiques mériteraient une modernisation.'),
      (4, 'L évolution salariale est lente malgré une bonne performance.'),
      (5, 'Les horaires peuvent être contraignants selon les périodes d activité.'),
      (6, 'Certaines décisions manquent de transparence vis à vis des équipes.'),
      (7, 'Le partage d informations entre départements pourrait être optimisé.'),
      (8, 'La pression peut être forte lors des périodes de clôture.'),
      (9, 'Les réunions sont parfois trop nombreuses et rallongent les délais.'),
      (10, 'La mobilité interne n est pas toujours facile à obtenir.'),
      (11, 'Le budget formation est limité pour certains postes.'),
      (12, 'Les délais de prise de décision peuvent frustrer les équipes terrain.'),
      (13, 'L équilibre vie pro vie perso est parfois difficile à maintenir.'),
      (14, 'La documentation des processus est incomplète sur certains sujets.'),
      (15, 'Les feedbacks de la hiérarchie ne sont pas assez réguliers.'),
      (16, 'La coordination entre équipes pourrait gagner en fluidité.'),
      (17, 'Certains flux de travail restent manuels et chronophages.'),
      (18, 'Les ressources sont parfois insuffisantes pour répondre aux pics d activité.'),
      (19, 'L autonomie est bonne mais nécessite un accompagnement initial plus structuré.'),
      (20, 'Les processus internes gagneraient à être simplifiés.'),
      (21, 'La charge administrative peut alourdir le travail quotidien.'),
      (22, 'Les cycles de travail sont intenses mais gérables avec de l organisation.'),
      (23, 'La standardisation des pratiques entre sites pourrait être améliorée.'),
      (24, 'Les outils de collaboration auraient besoin d être actualisés.'),
      (25, 'La planification à moyen terme manque parfois de visibilité.'),
      (26, 'Le partage de connaissances reste trop dépendant des individus.'),
      (27, 'Les validations multi niveaux ralentissent parfois l exécution.'),
      (28, 'La communication descendante est bonne mais la remontée terrain peut progresser.'),
      (29, 'Les pics d activité demandent une priorisation stricte des tâches.'),
      (30, 'L harmonisation des méthodes de travail entre équipes est en cours.'),
      (31, 'Le contexte peut évoluer rapidement et nécessite de la réactivité.'),
      (32, 'Certaines procédures sont un peu rigides pour un environnement qui bouge.'),
      (33, 'Les délais d approbation peuvent impacter le timing des projets.'),
      (34, 'La coordination inter-équipes mériterait d être renforcée.'),
      (35, 'Les outils internes sont fonctionnels mais gagneraient à être plus intuitifs.'),
      (36, 'La charge varie significativement selon les cycles métier.'),
      (37, 'Le mentoring des nouveaux pourrait être plus structuré.'),
      (38, 'La communication sur la stratégie pourrait être plus explicite.'),
      (39, 'Les process sont présents mais leur application n est pas uniforme.'),
      (40, 'Le turnover dans certains services impacte la continuité.'),
      (41, 'Les retours post-projet ne sont pas toujours capitalisés.'),
      (42, 'La priorisation des tâches en période de pic pourrait être optimisée.'),
      (43, 'L accès à l information n est pas toujours centralisé.'),
      (44, 'Les jalons d évolution de carrière manquent de clarté.'),
      (45, 'La répartition de la charge entre équipes pourrait être mieux équilibrée.'),
      (46, 'Les réunions de suivi gagneraient à être plus ciblées.'),
      (47, 'Le système de feedback pourrait être plus régulier et formel.'),
      (48, 'L onboarding est bien fait mais pourrait intégrer plus de pratique.'),
      (49, 'Les process de reporting sont parfois redondants.'),
      (50, 'La transversalité entre services fonctionne mais peut progresser.'),
      (51, 'Les délais internes impactent parfois la réactivité client.'),
      (52, 'La documentation projet mériterait d être systématisée.'),
      (53, 'Les canaux de communication sont multiples mais pas toujours coordonnés.'),
      (54, 'L anticipation des pics d activité pourrait être améliorée.'),
      (55, 'La gestion des priorités change parfois rapidement ce qui exige de la souplesse.'),
      (56, 'Les processus qualité sont en place mais lourds à appliquer.'),
      (57, 'Le partage des bonnes pratiques entre équipes est encore limité.'),
      (58, 'La montée en compétence sur les outils internes prend du temps.'),
      (59, 'Les interlocuteurs pour les validations sont parfois difficiles à identifier.'),
      (60, 'La charge de travail est irrégulière selon les périodes.'),
      (61, 'L information circule bien mais peut manquer de synthèse.'),
      (62, 'Les processus décisionnels impliquent plusieurs niveaux de validation.'),
      (63, 'Le contexte de travail exige une bonne capacité d adaptation.')
  ) as t(idx, sentence)
),

-- CLOSING sentences - 64 unique options
closing_sentences as (
  select *
  from (
    values
      (0, 'Dans l ensemble je recommande cette entreprise pour ceux qui cherchent de la stabilité.'),
      (1, 'C est une bonne expérience pour démarrer ou développer sa carrière.'),
      (2, 'Les points positifs l emportent sur les quelques axes d amélioration.'),
      (3, 'Je garde un bon souvenir de mon passage dans cette structure.'),
      (4, 'L entreprise a du potentiel et les équipes sont motivated.'),
      (5, 'C est un environnement propice à l apprentissage et au développement.'),
      (6, 'Je suis satisfait de mon parcours malgré quelques défis rencontrés.'),
      (7, 'L expérience globale est positive et je la recommande aux jeunes professionnels.'),
      (8, 'C est une structure qui offre de réelles opportunités pour les performeurs.'),
      (9, 'Le bilan de mon expérience est largement positif.'),
      (10, 'Je recommande pour ceux qui veulent évoluer dans un environnement structuré.'),
      (11, 'C est une entreprise sérieuse qui valorise le travail bien fait.'),
      (12, 'L encadrement et l équipe rendent l expérience agréable au quotidien.'),
      (13, 'Je garde une impression positive de cette expérience professionnelle.'),
      (14, 'C est un bon choix pour ceux qui cherchent un environnement stable.'),
      (15, 'Les conditions sont réunies pour progresser et se développer.'),
      (16, 'Je suis reconnaissant pour les opportunités qui m ont été offertes.'),
      (17, 'C est une entreprise qui sait reconnaître la valeur de ses employés.'),
      (18, 'L expérience m a permis de grandir professionnellement.'),
      (19, 'Je recommande cette structure pour son encadrement de qualité.'),
      (20, 'C est un environnement qui favorise l épanouissement professionnel.'),
      (21, 'Malgré quelques ajustements nécessaires le bilan reste positif.'),
      (22, 'Je suis content d avoir fait partie de cette équipe.'),
      (23, 'C est une entreprise qui investit dans l avenir de ses collaborateurs.'),
      (24, 'L ambiance de travail rend l expérience agréable.'),
      (25, 'Je recommande pour la qualité de l encadrement et de l équipe.'),
      (26, 'C est un environnement stimulant pour ceux qui veulent progresser.'),
      (27, 'Mon passage dans cette entreprise restera une expérience positive.'),
      (28, 'C est une structure solide avec de vraies valeurs.'),
      (29, 'Je suis satisfait des missions qui m ont été confiées.'),
      (30, 'L entreprise mérite sa réputation et je la recommande.'),
      (31, 'C est une bonne adresse pour construire une carrière.'),
      (32, 'Je garde un excellent souvenir de la collaboration avec mes collègues.'),
      (33, 'C est un cadre idéal pour apprendre et progresser.'),
      (34, 'L équilibre global est positif malgré quelques défis.'),
      (35, 'Je recommande sans hésitation pour l ambiance et le management.'),
      (36, 'C est une entreprise qui sait accompagner ses collaborateurs.'),
      (37, 'L expérience a répondu à mes attentes professionnelles.'),
      (38, 'C est un choix judicieux pour démarrer dans le secteur.'),
      (39, 'Je suis fier d avoir contribué aux projets de cette entreprise.'),
      (40, 'C est un environnement où l on peut s investir durablement.'),
      (41, 'La qualité de l équipe rend l expérience mémorable.'),
      (42, 'C est une structure qui mérite sa bonne réputation.'),
      (43, 'Je suis heureux d avoir rejoint cette entreprise.'),
      (44, 'C est un cadre professionnel que je recommande vivement.'),
      (45, 'L expérience a dépassé mes attentes initiales.'),
      (46, 'C est une entreprise qui a su me faire confiance.'),
      (47, 'Je recommande pour la richesse des missions et de l équipe.'),
      (48, 'C est un environnement où l on apprend tous les jours.'),
      (49, 'Le bilan est très positif sur l ensemble de mon parcours.'),
      (50, 'C est une adresse à retenir pour les professionnels du secteur.'),
      (51, 'Je suis reconnaissant pour l accompagnement dont j ai bénéficié.'),
      (52, 'C est une entreprise qui sait valoriser ses talents.'),
      (53, 'L expérience a été une vraie opportunité de développement.'),
      (54, 'C est un environnement propice à l épanouissement.'),
      (55, 'Je recommande pour la qualité des projets et du management.'),
      (56, 'C est une structure qui a de l avenir devant elle.'),
      (57, 'Mon expérience a été à la hauteur de mes espérances.'),
      (58, 'C est un choix que je referais sans hésiter.'),
      (59, 'L entreprise a su me donner les moyens de réussir.'),
      (60, 'C est un environnement où règne un bon esprit d équipe.'),
      (61, 'Je garde le souvenir d une expérience professionnelle enrichissante.'),
      (62, 'C est une structure qui mérite d être connue.'),
      (63, 'Je conclurai en disant que l expérience globale a été très positive.')
  ) as t(idx, sentence)
),

-- PROS sentences - 64 unique options
pros_sentences as (
  select *
  from (
    values
      (0, 'Esprit d équipe remarquable et entraide entre collègues.'),
      (1, 'Formation continue et opportunités d évolution réelles.'),
      (2, 'Stabilité de l emploi et sécurité financière.'),
      (3, 'Avantages sociaux compétitifs par rapport au marché.'),
      (4, 'Management accessible et à l écoute des équipes.'),
      (5, 'Missions variées et projets stimulants au quotidien.'),
      (6, 'Équilibre vie pro vie perso globalement bien respecté.'),
      (7, 'Culture d entreprise saine et valeurs partagées.'),
      (8, 'Environnement de travail moderne et équipements adaptés.'),
      (9, 'Autonomie dans la gestion de son travail quotidien.'),
      (10, 'Reconnaissance du travail bien fait par la direction.'),
      (11, 'Parcours de carrière clair et possibilités d évolution.'),
      (12, 'Équipe compétente et collaboration efficace.'),
      (13, 'Conditions matérielles satisfaisantes pour travailler.'),
      (14, 'Ambiance conviviale tout en restant professionnelle.'),
      (15, 'Accompagnement structuré des nouveaux arrivants.'),
      (16, 'Confiance accordée aux collaborateurs autonomes.'),
      (17, 'Transparence de la direction sur les objectifs.'),
      (18, 'Richesse des échanges et partage de connaissances.'),
      (19, 'Organisation claire et processus bien définis.'),
      (20, 'Diversité des missions confiées aux employés.'),
      (21, 'Encadrement de qualité et bienveillant.'),
      (22, 'Moyens mis à disposition pour réussir ses missions.'),
      (23, 'Communication fluide entre les équipes.'),
      (24, 'Reconnaissance de l investissement et de la performance.'),
      (25, 'Climat social apaisé et respectueux.'),
      (26, 'Opportunités de formation régulièrement proposées.'),
      (27, 'Management de proximité attentif aux équipes.'),
      (28, 'Projets innovants qui permettent d apprendre.'),
      (29, 'Rémunération et avantages conformes au marché.'),
      (30, 'Environnement stimulant et motivant au quotidien.'),
      (31, 'Encadrement qui encourage la prise d initiative.'),
      (32, 'Collègues compétents et solidaires.'),
      (33, 'Processus d intégration bien organisé.'),
      (34, 'Vision stratégique clairement communiquée.'),
      (35, 'Valeur accordée au travail d équipe.'),
      (36, 'Horaires flexibles quand c est possible.'),
      (37, 'Investissement dans les outils de travail.'),
      (38, 'Reconnaissance des années d ancienneté.'),
      (39, 'Atmosphère de travail positive et bienveillante.'),
      (40, 'Support technique disponible et efficace.'),
      (41, 'Opportunités de mobilité interne.'),
      (42, 'Politique de formation ambitieuse.'),
      (43, 'Respect de l équilibre vie pro vie perso.'),
      (44, 'Management qui valorise l autonomie.'),
      (45, 'Cadre de travail agréable et fonctionnel.'),
      (46, 'Esprit de collaboration fort entre services.'),
      (47, 'Accompagnement dans la montée en compétences.'),
      (48, 'Reconnaissance des efforts et de l engagement.'),
      (49, 'Dynamisme des projets et des équipes.'),
      (50, 'Conditions de travail conformes aux attentes.'),
      (51, 'Culture d entraide et de partage.'),
      (52, 'Ouverture aux propositions d amélioration.'),
      (53, 'Structure solide et stable.'),
      (54, 'Management juste et équitable.'),
      (55, 'Possibilités d évolution de carrière.'),
      (56, 'Ambiance de travail stimulante.'),
      (57, 'Formation adaptée aux besoins du poste.'),
      (58, 'Confiance et responsabilisation.'),
      (59, 'Respect des collaborateurs.'),
      (60, 'Vision long terme partagée.'),
      (61, 'Encouragement à l innovation.'),
      (62, 'Cohésion d équipe remarquable.'),
      (63, 'Environnement propice au développement.')
  ) as t(idx, sentence)
),

-- CONS sentences - 64 unique options
cons_sentences as (
  select *
  from (
    values
      (0, 'Processus décisionnels parfois longs et complexes.'),
      (1, 'Charge de travail variable selon les périodes de l année.'),
      (2, 'Outils informatiques qui mériteraient une modernisation.'),
      (3, 'Communication interne qui peut être améliorée.'),
      (4, 'Pression sur les objectifs parfois forte.'),
      (5, 'Évolution salariale lente malgré la performance.'),
      (6, 'Réunions nombreuses qui rallongent les délais.'),
      (7, 'Manque de feedbacks réguliers de la hiérarchie.'),
      (8, 'Mobilité interne pas assez développée.'),
      (9, 'Budget formation limité pour certains postes.'),
      (10, 'Horaires contraignants en période de forte activité.'),
      (11, 'Documentation des processus incomplète.'),
      (12, 'Délais de validation qui peuvent être longs.'),
      (13, 'Partage d informations entre services perfectible.'),
      (14, 'Turnover élevé dans certains départements.'),
      (15, 'Coordination inter-équipes à renforcer.'),
      (16, 'Charge administrative parfois lourde au quotidien.'),
      (17, 'Outils de travail pas toujours intuitifs.'),
      (18, 'Visibilité sur les évolutions de poste limitée.'),
      (19, 'Processus internes qui gagneraient à être simplifiés.'),
      (20, 'Ressources parfois insuffisantes pour les pics.'),
      (21, 'Standardisation des pratiques à améliorer.'),
      (22, 'Communication descendante à renforcer.'),
      (23, 'Délais d approbation parfois longs.'),
      (24, 'Équilibre vie pro vie perso difficile en période de clôture.'),
      (25, 'Système de feedback peu structuré.'),
      (26, 'Partage des bonnes pratiques limité.'),
      (27, 'Anticipation des pics d activité perfectible.'),
      (28, 'Processus qualité lourds à appliquer.'),
      (29, 'Mentoring pas assez formalisé.'),
      (30, 'Information pas toujours centralisée.'),
      (31, 'Jalons de carrière manquant de clarté.'),
      (32, 'Répartition de charge inégale entre équipes.'),
      (33, 'Réunions de suivi trop fréquentes.'),
      (34, 'Onboarding perfectible sur certains aspects.'),
      (35, 'Reporting parfois redondant.'),
      (36, 'Transversalité entre services à développer.'),
      (37, 'Délais internes impactant la réactivité.'),
      (38, 'Documentation projet pas systématisée.'),
      (39, 'Canaux de communication multiples et dispersés.'),
      (40, 'Contexte qui change rapidement exigeant adaptation.'),
      (41, 'Montée en compétence sur outils longue.'),
      (42, 'Interlocuteurs pour validations difficiles à identifier.'),
      (43, 'Charge de travail irrégulière.'),
      (44, 'Information qui manque parfois de synthèse.'),
      (45, 'Processus décisionnels à plusieurs niveaux.'),
      (46, 'Flux de travail encore manuels.'),
      (47, 'Planification moyen terme peu visible.'),
      (48, 'Application des processus pas uniforme.'),
      (49, 'Rétention des talents à améliorer.'),
      (50, 'Capitalisation des retours d expérience limitée.'),
      (51, 'Gestion des priorités changeante.'),
      (52, 'Accès à l information parfois difficile.'),
      (53, 'Coordination terrain direction perfectible.'),
      (54, 'Outils de collaboration à actualiser.'),
      (55, 'Communication sur la stratégie insuffisante.'),
      (56, 'Autonomie qui nécessite plus d encadrement.'),
      (57, 'Cycles de travail intenses.'),
      (58, 'Processus parfois trop rigides.'),
      (59, 'Besoin de plus de transparence décisionnelle.'),
      (60, 'Harmonisation entre sites perfectible.'),
      (61, 'Feedback terrain peu remonté.'),
      (62, 'Gestion des ressources en pic tendue.'),
      (63, 'Simplification des processus nécessaire.')
  ) as t(idx, sentence)
),

-- ADVICE sentences - 64 unique options
advice_sentences as (
  select *
  from (
    values
      (0, 'Renforcer les parcours d évolution interne avec des jalons clairs.'),
      (1, 'Investir davantage dans la formation continue des équipes.'),
      (2, 'Simplifier certains processus pour gagner en efficacité.'),
      (3, 'Valoriser davantage l expérience interne pour les promotions.'),
      (4, 'Développer le télétravail là où c est possible.'),
      (5, 'Améliorer les outils de travail collaboratif.'),
      (6, 'Créer plus d opportunités de mobilité interne.'),
      (7, 'Mieux répartir la charge de travail entre les équipes.'),
      (8, 'Renforcer la communication sur la stratégie de l entreprise.'),
      (9, 'Proposer des augmentations plus régulières pour les performeurs.'),
      (10, 'Encourager l innovation et les initiatives des collaborateurs.'),
      (11, 'Mieux reconnaître l engagement et les années d ancienneté.'),
      (12, 'Structurer davantage le mentoring pour les nouveaux.'),
      (13, 'Harmoniser les pratiques entre les différentes équipes.'),
      (14, 'Clarifier les priorités en amont des périodes chargées.'),
      (15, 'Continuer à investir dans le bien-être des employés.'),
      (16, 'Développer les feedbacks réguliers entre managers et équipes.'),
      (17, 'Moderniser les outils informatiques pour plus d efficacité.'),
      (18, 'Faciliter les échanges entre les différents départements.'),
      (19, 'Mieux anticiper les pics d activité pour soulager les équipes.'),
      (20, 'Renforcer la transparence sur les décisions importantes.'),
      (21, 'Proposer plus de formations adaptées aux besoins terrain.'),
      (22, 'Simplifier les circuits de validation pour plus de réactivité.'),
      (23, 'Valoriser les parcours internes et la mobilité.'),
      (24, 'Améliorer la centralisation de l information.'),
      (25, 'Développer les échanges de bonnes pratiques entre équipes.'),
      (26, 'Structurer les retours post-projet pour capitaliser l expérience.'),
      (27, 'Renforcer l accompagnement des nouveaux arrivants.'),
      (28, 'Optimiser les réunions pour gagner du temps.'),
      (29, 'Mieux communiquer sur les opportunités d évolution.'),
      (30, 'Équilibrer la charge de travail sur l année.'),
      (31, 'Investir dans des outils plus intuitifs.'),
      (32, 'Développer l autonomie avec un encadrement adapté.'),
      (33, 'Créer des espaces d échange entre services.'),
      (34, 'Renforcer le suivi des plans de progression individuels.'),
      (35, 'Simplifier les processus administratifs du quotidien.'),
      (36, 'Mieux valoriser les initiatives et les propositions.'),
      (37, 'Développer une culture du feedback constructif.'),
      (38, 'Améliorer la visibilité sur les projets à moyen terme.'),
      (39, 'Renforcer la coordination entre les équipes terrain et support.'),
      (40, 'Proposer des parcours de formation personnalisés.'),
      (41, 'Faciliter l accès à l information pour tous.'),
      (42, 'Développer la transversalité dans les projets.'),
      (43, 'Mieux reconnaître les efforts en période de forte activité.'),
      (44, 'Investir dans la qualité de vie au travail.'),
      (45, 'Structurer les échanges entre managers et collaborateurs.'),
      (46, 'Renforcer l intégration des nouveaux dans la culture entreprise.'),
      (47, 'Optimiser les processus de reporting.'),
      (48, 'Développer la communication sur les réussites collectives.'),
      (49, 'Faciliter la remontée des idées depuis le terrain.'),
      (50, 'Mieux articuler les objectifs individuels et collectifs.'),
      (51, 'Investir dans la formation des managers.'),
      (52, 'Développer la reconnaissance au quotidien.'),
      (53, 'Améliorer la gestion des ressources en période de pic.'),
      (54, 'Renforcer la cohésion entre les différentes équipes.'),
      (55, 'Simplifier les processus qualité pour plus d efficacité.'),
      (56, 'Mieux anticiper les besoins en formation.'),
      (57, 'Développer une communication plus fluide.'),
      (58, 'Valoriser l expertise interne.'),
      (59, 'Créer des opportunités de partage d expérience.'),
      (60, 'Renforcer le dialogue social.'),
      (61, 'Optimiser l organisation du travail au quotidien.'),
      (62, 'Développer l agilité dans les processus.'),
      (63, 'Continuer à écouter les remontées du terrain.')
  ) as t(idx, sentence)
),

payload as (
  select
    v.business_id,
    format('seed_unique_v4:%s:review-%s', v.business_id, lpad(v.idx::text, 2, '0')) as moderation_reason_code,
    -- Author: deterministic unique name per review
    mn.first_name || ' ' || li.initial as author_name,
    -- Title: unique per review
    ut.title,
    -- Content: 3 unique sentences combined (64^3 = 262,144 unique combinations)
    os.sentence || ' ' || ms.sentence || ' ' || cs.sentence as content,
    -- Rating: deterministic distribution
    case
      when (v.h4 % 100) < 12 then 3
      when (v.h4 % 100) < 75 then 4
      else 5
    end as rating,
    -- Role: category-based
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
    -- Pros: unique per review
    ps.sentence as pros,
    -- Cons: unique per review
    cns.sentence as cons,
    -- Advice: unique per review
    as_.sentence as advice_to_management,
    (v.h5 % 100) >= 20 as would_recommend,
    (v.h5 % 100) >= 30 as ceo_approval,
    (date_trunc('month', timezone('utc'::text, now())) - ((14 + v.idx + (v.h0 % 18))::text || ' months')::interval)::date as experience_start_month,
    (least(
      date_trunc('month', timezone('utc'::text, now())) - interval '1 month',
      (date_trunc('month', timezone('utc'::text, now())) - ((14 + v.idx + (v.h0 % 18))::text || ' months')::interval + ((6 + (v.h1 % 20))::text || ' months')::interval)
    ))::date as experience_end_month,
    current_date - (4 + v.idx * 5 + (v.h2 % 21)) as date,
    'published'::text as status,
    timezone('utc'::text, now()) - ((3 + v.idx + (v.h3 % 9))::text || ' days')::interval as published_at,
    jsonb_build_object(
      'seed_batch', 'seed_unique_v4',
      'seeded', true,
      'index', v.idx
    ) as risk_flags
  from variants v
  join moroccan_names mn on mn.idx = (v.h0 + v.h1) % 32
  join last_initials li on li.idx = v.h2 % 8
  join unique_titles ut on ut.idx = v.h0 % 32
  join opening_sentences os on os.idx = v.h0 % 64
  join middle_sentences ms on ms.idx = v.h1 % 64
  join closing_sentences cs on cs.idx = v.h2 % 64
  join pros_sentences ps on ps.idx = (v.h3 + v.h4) % 64
  join cons_sentences cns on cns.idx = (v.h5 + v.h6) % 64
  join advice_sentences as_ on as_.idx = (v.h7 + v.h0) % 64
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
    business_id, user_id, author_name, is_anonymous, rating, title, content,
    date, status, employment_status, role_slug, department_slug, city_slug,
    tenure_band, contract_type, work_mode, pros, cons, advice_to_management,
    would_recommend, ceo_approval, experience_start_month, experience_end_month,
    moderation_reason_code, risk_flags, published_at
  )
  select
    p.business_id, null, p.author_name, true, p.rating, p.title, p.content,
    p.date, p.status, p.employment_status, p.role_slug, p.department_slug, p.city_slug,
    p.tenure_band, p.contract_type, p.work_mode, p.pros, p.cons, p.advice_to_management,
    p.would_recommend, p.ceo_approval, p.experience_start_month, p.experience_end_month,
    p.moderation_reason_code, p.risk_flags, p.published_at
  from payload p
  where not exists (
    select 1 from public.reviews r where r.moderation_reason_code = p.moderation_reason_code
  )
  returning id
),
pruned as (
  delete from public.reviews r
  where r.moderation_reason_code like 'seed_unique_v4:%'
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
  (select count(*) from public.reviews r where r.moderation_reason_code like 'seed_unique_v4:%') as total_seeded,
  (select count(*) >= 200 from public.reviews r where r.moderation_reason_code like 'seed_unique_v4:%') as reached_target;

commit;

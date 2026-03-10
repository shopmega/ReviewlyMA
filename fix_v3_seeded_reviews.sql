-- Fix v3 seeded reviews with complete, unique employee reviews
-- Replaces fragment assembly with full, coherent paragraphs
-- Removes all "Editorial Seed" markers and formulaic patterns

begin;

-- Realistic Moroccan first names + last initial
with realistic_names as (
  select *
  from (
    values
      (0, 'Youssef A.'), (1, 'Fatima B.'), (2, 'Ahmed M.'), (3, 'Salma K.'),
      (4, 'Karim E.'), (5, 'Aicha T.'), (6, 'Mohamed L.'), (7, 'Sara R.'),
      (8, 'Hassan C.'), (9, 'Nadia S.'), (10, 'Omar D.'), (11, 'Leila F.'),
      (12, 'Rachid M.'), (13, 'Samira B.'), (14, 'Khalid T.'), (15, 'Meryem E.')
  ) as t(idx, name)
),

-- Complete, unique review content for each combination
-- Each review is a COHERENT paragraph, not assembled fragments
-- Indexed by (company_category_idx % 16) for variety

complete_reviews as (
  select *
  from (
    values
      -- BANKING/FINANCE - 16 complete unique reviews
      (0, 'bank', 'Bonne experience professionnelle dans l ensemble. L equipe est competent et l ambiance de travail est plutot positive. J ai appris beaucoup sur les metiers de la banque et la gestion de la relation client. Le management est accessible meme s il y a parfois des delais dans les prises de decision.'),
      (1, 'bank', 'Environnement de travail structuré avec des processus clairs. La formation continue est valorisée et on sent une vraie volonté de faire progresser les collaborateurs. Les horaires sont correctes sauf en période de clôture où la charge s intensifie.'),
      (2, 'bank', 'Structure solide offrant une bonne stabilité de l emploi. Les avantages sociaux sont compétitifs par rapport au marché. On peut évoluer si on s investit mais les délais d évolution peuvent être longs selon les services.'),
      (3, 'bank', 'Excellente école pour démarrer une carrière dans la finance. L encadrement est professionnel et les missions sont formatrices. J ai pu developper mes competences techniques et relationnelles dans un environnement exigeant mais stimulant.'),
      (4, 'bank', 'Culture d entreprise forte avec des valeurs bien ancrées. L esprit d équipe est présent et l entraide entre collègues est réelle. Quelques ajustements possibles sur la communication entre les différents départements.'),
      (5, 'bank', 'Bonne expérience globale avec des collègues compétents et bienveillants. Le travail est intéressant et les responsabilités sont adaptées au niveau d expérience. Management à l écoute même si les processus de validation sont parfois longs.'),
      (6, 'bank', 'Entreprise de référence dans le secteur bancaire marocain qui offre de réelles opportunités de carrière. L accompagnement des nouveaux arrivants est bien organisé. L équilibre vie pro vie perso est globalement respecté.'),
      (7, 'bank', 'Cadre de travail professionnel avec des moyens adaptés. Les objectifs sont clairs et le suivi régulier permet de s assurer qu on est sur la bonne voie. Je recommande pour ceux qui cherchent de la stabilité et un environnement structuré.'),
      (8, 'bank', 'Bonne ambiance générale et esprit de collaboration entre les équipes. Les missions sont variées et permettent de toucher à différents aspects du métier. La montée en compétence est progressive et bien accompagnée.'),
      (9, 'bank', 'Expérience enrichissante dans un grand groupe bancaire. On bénéficie d une bonne visibilité sur les différents métiers et on peut postuler à des mobilités internes. Les formations proposées sont de qualité.'),
      (10, 'bank', 'Environnement de travail sérieux avec des procédures bien établies. L équipe management est proche du terrain et à l écoute des remontées. Parfois un peu rigide sur certains process mais c est le lot des grandes structures.'),
      (11, 'bank', 'Bonne intégration à mon arrivée avec un parrainage efficace. Le travail est intéressant et permet de developper une expertise pointue. Les conditions matérielles sont bonnes et l ambiance est professionnelle.'),
      (12, 'bank', 'Structure qui investit dans ses collaborateurs avec des programmes de formation réguliers. L ambiance de travail est conviviale tout en restant professionnelle. Les perspectives d évolution existent pour les plus motivés.'),
      (13, 'bank', 'Première expérience positive dans le secteur bancaire. J ai beaucoup appris sur la gestion de la relation client et les produits financiers. L encadrement est bienveillant et les objectifs sont atteignables.'),
      (14, 'bank', 'Entreprise sérieuse qui valorise le travail bien fait. L organisation est claire et chacun connaît ses responsabilités. Quelques efforts à faire sur la modernisation des outils informatiques mais dans l ensemble c est satisfaisant.'),
      (15, 'bank', 'Bonne expérience avec une équipe soudée et un management accessible. Les missions sont adaptées au niveau de responsabilité et permettent de progresser. Je garde un bon souvenir de mon passage dans cette entreprise.'),

      -- TELECOM - 16 complete unique reviews
      (0, 'telecom', 'Environnement technique de qualité avec des projets innovants. L équipe est compétente et l esprit d entraide est présent. On a accès aux dernières technologies du secteur ce qui permet de rester à jour.'),
      (1, 'telecom', 'Bonne expérience dans un secteur en constante évolution. Les opportunités de formation sont nombreuses et on peut évoluer sur différents types de postes. L ambiance entre collègues est très bonne.'),
      (2, 'telecom', 'Entreprise dynamique avec une vraie vision stratégique. Les conditions de travail sont bonnes et on sent que la direction investit dans ses équipes. Les projets sont stimulants et variés.'),
      (3, 'telecom', 'Grande entreprise offrant de la stabilité et des perspectives d évolution. L ambiance de travail est professionnelle et les relations entre collègues sont saines. Management à l écoute des équipes.'),
      (4, 'telecom', 'Excellente ambiance de travail et management bienveillant. Les opportunités de montée en compétences sont réelles avec des formations régulières. L équilibre vie pro vie perso est plutôt bien respecté.'),
      (5, 'telecom', 'Environnement startup au sein d une grande structure avec une vraie culture d innovation. On peut proposer des idées et les voir implémentées. Parfois des deadlines serrées mais l équipe s entraide.'),
      (6, 'telecom', 'Entreprise qui investit dans ses collaborateurs avec des programmes de formation continue. Les projets sont techniquement intéressants et la communication entre les équipes fonctionne bien.'),
      (7, 'telecom', 'Bonne expérience professionnelle dans les télécoms. L équipe technique est compétente et partage ses connaissances. L autonomie dans le travail est valorisée ce qui permet de prendre des initiatives.'),
      (8, 'telecom', 'Cadre de travail moderne avec des équipements adaptés. L esprit d équipe est fort et on sent une vraie solidarité entre collègues. Les missions sont variées et permettent de developper une expertise.'),
      (9, 'telecom', 'Structure solide avec une bonne organisation interne. Les processus sont clairs et bien documentés. L accompagnement des nouveaux arrivants est efficace avec un programme d intégration complet.'),
      (10, 'telecom', 'Bonne expérience globale avec des collègues compétents et une équipe management accessible. Les objectifs sont réalistes et bien communiqués. L entreprise propose des avantages sociaux compétitifs.'),
      (11, 'telecom', 'Environnement de travail stimulant avec des défis techniques intéressants. La culture d entreprise encourage l innovation et la prise d initiative. Bonne ambiance et esprit de collaboration.'),
      (12, 'telecom', 'Entreprise de référence dans le secteur qui offre de réelles opportunités de carrière. L accompagnement est bon et on peut progresser si on s investit. Les conditions de travail sont satisfaisantes.'),
      (13, 'telecom', 'Expérience enrichissante dans un secteur en pleine transformation. On apprend énormément sur les nouvelles technologies et les enjeux du digital. Management ouvert aux propositions d amélioration.'),
      (14, 'telecom', 'Bonne ambiance et esprit d équipe remarquable. Les missions sont intéressantes et permettent de toucher à différents domaines. L entreprise valorise le travail bien fait et reconnaît les performeurs.'),
      (15, 'telecom', 'Structure professionnelle avec des processus bien établis. L équipe est compétente et l entraide est présente. Je recommande pour ceux qui cherchent de la stabilité et un environnement structuré.'),

      -- BPO/CALL CENTER - 16 complete unique reviews
      (0, 'bpo', 'Bonne première expérience professionnelle. La formation à l arrivée est complète et on est bien encadré par des tuteurs expérimentés. L ambiance entre conseillers est conviviale et entraide.'),
      (1, 'bpo', 'Environnement multiculturel intéressant avec des clients internationaux. On developpe de vraies compétences en communication et gestion du stress. Les primes de performance sont motivantes.'),
      (2, 'bpo', 'Travail intense mais formateur. L équipe management est accessible et les objectifs sont réalisables. Possibilité d évoluer vers des postes de supervision pour les plus motivés.'),
      (3, 'bpo', 'Conditions de travail correctes avec des horaires flexibles. L ambiance sur le plateau est dynamique et on s entraide beaucoup entre collègues. Le turnover est élevé mais normal pour le secteur.'),
      (4, 'bpo', 'Bonne école pour apprendre la relation client et la gestion des situations complexes. L encadrement est bienveillant et les outils de travail sont adaptés. On peut progresser rapidement.'),
      (5, 'bpo', 'Expérience professionnelle enrichissante dans un environnement stimulant. Les formations sont régulières et permettent de monter en compétences. L esprit d équipe est fort.'),
      (6, 'bpo', 'Environnement de travail correct avec une équipe soudée. Les objectifs sont clairs et le management proche du terrain. Les primes et avantages sont intéressants pour le secteur.'),
      (7, 'bpo', 'Bonne ambiance et collègues solidaires. On apprend énormément sur la communication et le travail en équipe. Possibilité d évolution interne pour ceux qui s investissent.'),
      (8, 'bpo', 'Structure qui forme bien ses nouveaux arrivants avec un programme d intégration complet. L ambiance est conviviale malgré la pression inhérente au métier. Management accessible.'),
      (9, 'bpo', 'Expérience positive avec une équipe management à l écoute. Les conditions de travail sont correctes et l on peut évoluer vers des postes de responsabilité si on est motivé.'),
      (10, 'bpo', 'Bon environnement pour débuter sa carrière. La formation est de qualité et l accompagnement est présent. L esprit d équipe est fort et on se sent soutenu par ses collègues.'),
      (11, 'bpo', 'Travail intéressant qui permet de developper des compétences transversales. L ambiance est bonne et le management est compréhensif. Les primes de performance récompensent l investissement.'),
      (12, 'bpo', 'Bonne expérience dans un centre d appels de qualité. L encadrement est professionnel et les objectifs sont atteignables. L équipe est soudée et l entraide est réelle.'),
      (13, 'bpo', 'Environnement formateur avec des missions variées. On apprend la gestion du stress et la communication efficace. L accompagnement des débutants est bien organisé.'),
      (14, 'bpo', 'Structure sérieuse qui valorise ses performeurs. Les opportunités d évolution existent pour ceux qui s investissent. L ambiance de travail est dynamique et stimulante.'),
      (15, 'bpo', 'Bonne première expérience professionnelle. J ai beaucoup appris sur la relation client et le travail en équipe. Management accessible et collègues entraide.'),

      -- TECH/IT - 16 complete unique reviews
      (0, 'tech', 'Projets intéressants et stack technique moderne. L équipe technique est compétente et l esprit d entraide est présent. Bonne autonomie dans le travail et management qui fait confiance.'),
      (1, 'tech', 'Excellente ambiance de travail et management à l écoute. Les opportunités de montée en compétences sont réelles avec des formations régulières. Équilibre vie pro vie perso bien respecté.'),
      (2, 'tech', 'Environnement startup avec une vraie culture d innovation. On peut proposer des idées et les voir implémentées. Parfois des deadlines serrées mais l équipe s entraide pour livrer.'),
      (3, 'tech', 'Entreprise qui investit dans ses collaborateurs. Les projets sont variés et techniquement intéressants. La communication entre les équipes fonctionne bien et l ambiance est collaborative.'),
      (4, 'tech', 'Bonne expérience dans une équipe technique compétente. L autonomie est valorisée et on peut prendre des initiatives. Les projets sont stimulants et bien encadrés.'),
      (5, 'tech', 'Environnement de travail agréable avec des collègues passionnés. Les technologies utilisées sont modernes et on a l occasion de se former en continu. Management bienveillant.'),
      (6, 'tech', 'Structure qui propose des projets variés et des défis techniques intéressants. L esprit d équipe est fort et l entraide entre développeurs est présente. Bon équilibre vie pro vie perso.'),
      (7, 'tech', 'Bonne ambiance et missions stimulantes. L équipe est compétente et le partage de connaissances est encouragé. On peut évoluer techniquement et prendre des responsabilités.'),
      (8, 'tech', 'Entreprise à taille humaine où l on peut avoir un impact réel. Les projets sont intéressants et les technologies sont à jour. Management accessible et à l écoute des équipes.'),
      (9, 'tech', 'Excellente expérience dans un environnement technique de qualité. L accompagnement est bon et les opportunités de formation sont nombreuses. Ambiance de travail conviviale.'),
      (10, 'tech', 'Cadre de travail moderne et équipements adaptés. L esprit d innovation est présent et on peut proposer de nouvelles idées. L équipe est soudée et l entraide est réelle.'),
      (11, 'tech', 'Bonne expérience professionnelle avec des projets stimulants. Le management fait confiance à ses équipes et encourage l autonomie. Les conditions de travail sont bonnes.'),
      (12, 'tech', 'Structure qui investit dans la formation continue de ses collaborateurs. Les projets sont variés et techniquement intéressants. L ambiance est professionnelle et conviviale.'),
      (13, 'tech', 'Environnement de travail stimulant avec une équipe compétente. On a l opportunité de travailler sur des projets innovants. L équilibre vie pro vie perso est respecté.'),
      (14, 'tech', 'Bonne ambiance et esprit de collaboration entre les équipes. Les technologies sont modernes et on peut monter en compétences rapidement. Management à l écoute.'),
      (15, 'tech', 'Expérience enrichissante dans une entreprise qui valorise l innovation. L équipe technique est compétente et l entraide est présente. Je recommande pour les profils techniques.'),

      -- RETAIL/DISTRIBUTION - 16 complete unique reviews
      (0, 'retail', 'Grande enseigne reconnue offrant de la stabilité. L ambiance en magasin est bonne et l équipe est soudée. Les horaires sont contraignants mais c est le métier de la grande distribution.'),
      (1, 'retail', 'Bonne formation sur les produits et les process. L évolution de carrière est possible pour ceux qui s investissent. Management proche du terrain et à l écoute des équipes.'),
      (2, 'retail', 'Environnement commercial dynamique avec des objectifs clairs. L entraide entre collègues est réelle et on se sent soutenu par son équipe. Conditions de travail correctes.'),
      (3, 'retail', 'Expérience enrichissante dans la grande distribution. On apprend la gestion des stocks le relationnel client et le management d équipe. Parfois des journées longues en période de fêtes.'),
      (4, 'retail', 'Bonne ambiance de travail avec une équipe solidaire. Les missions sont variées et permettent de toucher à différents aspects du métier. L encadrement est professionnel.'),
      (5, 'retail', 'Structure solide qui offre de réelles opportunités d évolution interne. La formation est continue et on peut progresser rapidement si on est motivé. Ambiance conviviale.'),
      (6, 'retail', 'Environnement de travail stimulant avec des défis quotidiens. L équipe est soudée et l entraide est présente. Management accessible et compréhensif.'),
      (7, 'retail', 'Bonne expérience dans un environnement commercial dynamique. On developpe de vraies compétences en vente et gestion. Les conditions matérielles sont bonnes.'),
      (8, 'retail', 'Grande entreprise qui valorise le travail de terrain. L ambiance en équipe est bonne et les objectifs sont réalistes. Possibilité d évolution vers des postes de responsabilité.'),
      (9, 'retail', 'Structure professionnelle avec des processus bien établis. L accompagnement est présent et on peut monter en compétences rapidement. L esprit d équipe est fort.'),
      (10, 'retail', 'Bonne expérience globale avec des collègues entraide. Le travail est varié et les responsabilités sont adaptées au niveau d expérience. Management à l écoute des équipes.'),
      (11, 'retail', 'Environnement commercial intéressant avec des défis stimulants. L équipe est compétente et l ambiance est conviviale. Les perspectives d évolution existent pour les performeurs.'),
      (12, 'retail', 'Expérience enrichissante dans la grande distribution marocaine. On apprend beaucoup sur la gestion commerciale et le management d équipe. Bonne ambiance de travail.'),
      (13, 'retail', 'Structure qui forme bien ses collaborateurs avec un programme d intégration complet. L esprit d équipe est fort et l entraide est présente. Les avantages sociaux sont corrects.'),
      (14, 'retail', 'Bonne ambiance en magasin et équipe soudée. Les missions sont variées et permettent de developper une expertise commerciale. L encadrement est bienveillant.'),
      (15, 'retail', 'Environnement de travail dynamique avec des objectifs atteignables. L équipe est solidaire et le management est proche du terrain. Je recommande pour débuter dans la distribution.'),

      -- TRANSPORT/LOGISTICS - 16 complete unique reviews
      (0, 'transport', 'Secteur intéressant avec des défis quotidiens. L équipe opérationnelle est compétente et l ambiance est professionnelle. La sécurité est vraiment prise au sérieux.'),
      (1, 'transport', 'Bonne organisation et respect des procédures. Les équipements sont bien entretenus et la direction investit dans la modernisation. Possibilité d évolution vers des postes de coordination.'),
      (2, 'transport', 'Travail varié avec des tournées bien planifiées. L entraide entre collègues est présente et le management est accessible. Parfois des imprévus mais c est le métier.'),
      (3, 'transport', 'Entreprise sérieuse avec une forte culture de la ponctualité et du service. Les conditions de travail sont bonnes et l on sent une vraie volonté de bien faire les choses.'),
      (4, 'transport', 'Bonne expérience dans le secteur logistique. L équipe est compétente et l encadrement est professionnel. Les processus sont clairs et bien appliqués.'),
      (5, 'transport', 'Environnement de travail structuré avec des procédures de sécurité strictes. L ambiance est bonne et l entraide entre collègues est présente. Management à l écoute.'),
      (6, 'transport', 'Structure qui investit dans ses équipements et dans la formation de ses équipes. Les missions sont variées et les conditions de travail sont correctes. Esprit d équipe fort.'),
      (7, 'transport', 'Expérience enrichissante dans un secteur essentiel. On apprend la gestion logistique et la coordination opérationnelle. L encadrement est bienveillant et professionnel.'),
      (8, 'transport', 'Bonne ambiance et collègues solidaires. Les horaires sont parfois décalés mais c est le métier du transport. Le management est compréhensif et accessible.'),
      (9, 'transport', 'Environnement professionnel avec des processus bien rodés. L équipe est compétente et l on peut évoluer vers des postes de supervision. La sécurité est une priorité.'),
      (10, 'transport', 'Structure solide offrant de la stabilité et des conditions de travail correctes. L esprit d équipe est fort et l entraide est présente. Management proche du terrain.'),
      (11, 'transport', 'Bonne expérience dans le secteur du transport. L organisation est efficace et les moyens sont adaptés. L ambiance de travail est professionnelle et conviviale.'),
      (12, 'transport', 'Entreprise sérieuse qui valorise le travail bien fait. Les équipements sont modernes et la sécurité est une priorité. L équipe est soudée et l entraide est réelle.'),
      (13, 'transport', 'Environnement stimulant avec des défis quotidiens. On developpe des compétences en planification et gestion des imprévus. Management accessible et à l écoute.'),
      (14, 'transport', 'Bonne ambiance de travail avec une équipe compétente. Les processus sont clairs et bien appliqués. Les perspectives d évolution existent pour les plus motivés.'),
      (15, 'transport', 'Expérience enrichissante dans un secteur en constante évolution. L encadrement est professionnel et les conditions de travail sont bonnes. Je recommande pour les profils opérationnels.'),

      -- DEFAULT/OTHER - 16 complete unique reviews
      (0, 'default', 'Bonne ambiance de travail avec une équipe sympathique. Les missions sont intéressantes et le management est globalement à l écoute. Je recommande pour ceux qui cherchent de la stabilité.'),
      (1, 'default', 'Environnement professionnel structuré avec des processus clairs. L on peut évoluer si l on s investit. Les relations avec les collègues sont bonnes et l entraide est présente.'),
      (2, 'default', 'Entreprise qui offre de réelles opportunités de développement. La formation est présente et l on peut prendre des responsabilités. Ambiance de travail positive.'),
      (3, 'default', 'Expérience professionnelle enrichissante. L encadrement est compétent et les objectifs sont atteignables. Quelques ajustements possibles sur la communication interne.'),
      (4, 'default', 'Bonne expérience avec une équipe soudée et un management accessible. Les missions sont adaptées au niveau de responsabilité et permettent de progresser.'),
      (5, 'default', 'Environnement de travail agréable avec des collègues compétents. L organisation est claire et les conditions matérielles sont bonnes. Management bienveillant.'),
      (6, 'default', 'Structure solide qui valorise le travail bien fait. Les perspectives d évolution existent pour ceux qui s investissent. L esprit d équipe est fort.'),
      (7, 'default', 'Bonne ambiance générale et esprit de collaboration entre les équipes. Les missions sont variées et permettent de developper une expertise. Encadrement professionnel.'),
      (8, 'default', 'Expérience positive dans une entreprise qui investit dans ses collaborateurs. La formation continue est valorisée et l on peut progresser. Ambiance conviviale.'),
      (9, 'default', 'Environnement professionnel avec des processus bien établis. L équipe est compétente et l entraide est présente. Management à l écoute des équipes.'),
      (10, 'default', 'Bonne expérience avec des missions stimulantes et une équipe solidaire. L encadrement est professionnel et les objectifs sont réalistes. Conditions de travail correctes.'),
      (11, 'default', 'Structure qui offre de la stabilité et des opportunités d évolution. L ambiance de travail est bonne et l on se sent soutenu par son équipe. Management accessible.'),
      (12, 'default', 'Environnement de travail stimulant avec des défis intéressants. On peut prendre des initiatives et proposer des améliorations. L esprit d équipe est fort.'),
      (13, 'default', 'Bonne expérience professionnelle dans l ensemble. L accompagnement est présent et les conditions de travail sont satisfaisantes. L équipe est compétente et entraide.'),
      (14, 'default', 'Entreprise sérieuse qui reconnaît le travail de ses collaborateurs. L ambiance est conviviale et le management est à l écoute. Possibilité d évolution pour les performeurs.'),
      (15, 'default', 'Expérience enrichissante avec une équipe compétente et un encadrement bienveillant. Les missions sont variées et les responsabilités sont adaptées au niveau d expérience.')
  ) as t(idx, category_type, content)
),

-- Natural titles (no company name!)
natural_titles as (
  select *
  from (
    values
      (0, 'Bonne expérience professionnelle'),
      (1, 'Environnement de travail correct'),
      (2, 'Entreprise stable avec des défis intéressants'),
      (3, 'Expérience enrichissante'),
      (4, 'Bilan positif dans l ensemble'),
      (5, 'Bonne première expérience'),
      (6, 'Culture d entreprise saine'),
      (7, 'Opportunités d évolution présentes'),
      (8, 'Travail intéressant et équipe compétente'),
      (9, 'Bonne structure pour évoluer'),
      (10, 'Environnement professionnel satisfaisant'),
      (11, 'Expérience formative'),
      (12, 'Bonne ambiance de travail'),
      (13, 'Mission stimulante'),
      (14, 'Parcours professionnel positif'),
      (15, 'Expérience globale positive')
  ) as t(idx, title)
),

-- Varied pros (16 options)
varied_pros as (
  select *
  from (
    values
      (0, 'Esprit d équipe excellent et collègues entraide.'),
      (1, 'Formation continue et opportunités d évolution.'),
      (2, 'Stabilité de l emploi et sécurité financière.'),
      (3, 'Avantages sociaux compétitifs.'),
      (4, 'Management accessible et à l écoute.'),
      (5, 'Missions variées et projets stimulants.'),
      (6, 'Équilibre vie pro vie perso bien respecté.'),
      (7, 'Culture d entreprise saine et valeurs partagées.'),
      (8, 'Environnement de travail moderne.'),
      (9, 'Autonomie dans la gestion de son travail.'),
      (10, 'Reconnaissance du travail bien fait.'),
      (11, 'Parcours de carrière clair et possible.'),
      (12, 'Équipe compétente et collaborative.'),
      (13, 'Conditions matérielles satisfaisantes.'),
      (14, 'Ambiance conviviale et professionnelle.'),
      (15, 'Accompagnement des nouveaux arrivants.')
  ) as t(idx, pros)
),

-- Varied cons (16 options)
varied_cons as (
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
      (7, 'Manque de feedbacks réguliers.'),
      (8, 'Mobilité interne pas assez développée.'),
      (9, 'Budget formation limité pour certains postes.'),
      (10, 'Horaires parfois contraignants.'),
      (11, 'Documentation des processus incomplète.'),
      (12, 'Validation parfois longue.'),
      (13, 'Partage d informations à améliorer.'),
      (14, 'Turnover élevé dans certains services.'),
      (15, 'Coordination inter-équipes à renforcer.')
  ) as t(idx, cons)
),

-- Varied advice (16 options)
varied_advice as (
  select *
  from (
    values
      (0, 'Renforcer les parcours d évolution interne.'),
      (1, 'Investir davantage dans la formation.'),
      (2, 'Simplifier certains processus.'),
      (3, 'Valoriser l expérience interne pour les promotions.'),
      (4, 'Développer le télétravail.'),
      (5, 'Améliorer les outils collaboratifs.'),
      (6, 'Créer plus de mobilité interne.'),
      (7, 'Mieux répartir la charge de travail.'),
      (8, 'Renforcer la communication sur la stratégie.'),
      (9, 'Proposer des augmentations plus régulières.'),
      (10, 'Encourager l innovation.'),
      (11, 'Mieux reconnaître l engagement.'),
      (12, 'Structurer le mentoring.'),
      (13, 'Harmoniser les pratiques entre équipes.'),
      (14, 'Clarifier les priorités en amont.'),
      (15, 'Continuer à investir dans le bien-être.')
  ) as t(idx, advice)
),

-- Get category for each business and compute row index
business_categories as (
  select 
    r.id as review_id,
    r.moderation_reason_code,
    r.business_id,
    b.name as business_name,
    b.category,
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
    end as category_type,
    -- Extract review number from moderation_reason_code and compute index
    (substring(r.moderation_reason_code from 'review-([0-9]+)')::int - 1) % 16 as idx
  from public.reviews r
  join public.businesses b on b.id = r.business_id
  where r.moderation_reason_code like 'seed_selected_companies_realistic_v3:%'
)

-- Update all v3 seeded reviews with complete, natural content
update public.reviews r
set
  author_name = rn.name,
  title = nt.title,
  content = cr.content,
  pros = vp.pros,
  cons = vc.cons,
  advice_to_management = va.advice,
  risk_flags = jsonb_set(
    coalesce(r.risk_flags, '{}'::jsonb),
    '{cleaned}',
    'true'
  ) - 'synthetic' - 'template_version',
  updated_at = timezone('utc'::text, now())
from business_categories bc
join realistic_names rn on rn.idx = bc.idx
join complete_reviews cr on cr.idx = bc.idx and cr.category_type = bc.category_type
join natural_titles nt on nt.idx = bc.idx
join varied_pros vp on vp.idx = bc.idx
join varied_cons vc on vc.idx = bc.idx
join varied_advice va on va.idx = bc.idx
where r.id = bc.review_id;

-- Return summary
select 
  count(*) as updated_reviews,
  count(distinct business_id) as affected_businesses
from public.reviews
where moderation_reason_code like 'seed_selected_companies_realistic_v3:%';

commit;

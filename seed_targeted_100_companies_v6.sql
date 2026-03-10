-- Balanced seeded reviews v6 for specific companies
-- Target: 100 companies with 0 reviews
-- Rating distribution: 8% (1★), 10% (2★), 17% (3★), 40% (4★), 25% (5★)
-- All new vocabulary different from v4/v5

begin;

with selected_ids(id) as (
  values
    ('dial-technologies-casablanca'),
    ('andalous-nova-nettoyage-kenitra'),
    ('al-nour-telecom-store-sale'),
    ('marrakech-marina-nettoyage-guelmim'),
    ('al-moutamayyiz-connect-ksar-el-kebir-partenaires-ksar-el-kebir'),
    ('tanger-technologies-sas-oujda'),
    ('tanger-consulting-sarl-kenitra'),
    ('groupe-al-moutamayyiz-trade-sa-guelmim'),
    ('groupe-horizon-city-sarl-marrakech'),
    ('groupe-alpha-tech-sa-dakhla'),
    ('al-ibtikar-services-co-ifrane'),
    ('agadir-market-errachidia-errachidia'),
    ('orient-engineering-hospital-ksar-el-kebir'),
    ('groupe-omega-marina-sarl-au-mohammedia'),
    ('agadir-sud-distribution-nador'),
    ('al-amal-marketing-services-beni-mellal'),
    ('marocain-groupe-ltd-tetouan'),
    ('marocain-pro-oujda-logistique-oujda'),
    ('dar-al-school-meknes-meknes'),
    ('sahara-engineering-engineering-ouarzazate'),
    ('casaworks-pharma-ltd-kenitra'),
    ('atlas-impact-distribution-khemisset'),
    ('al-moutamayyiz-solutions-sarl-tetouan'),
    ('groupe-dar-al-green-sarl-au-ifrane'),
    ('dar-media-market-khouribga'),
    ('alpha-park-distribution-taza'),
    ('groupe-orient-trade-ltd-beni-mellal'),
    ('rif-hospital-agadir-agadir'),
    ('marocain-cleaning-services-maintenance-safi'),
    ('orient-prime-guelmim-industries-guelmim'),
    ('groupe-casaworks-park-sas-tetouan'),
    ('al-ibtikar-city-nador-construction-nador'),
    ('al-manar-securite-co-tetouan'),
    ('orient-trade-sale-immobilier-sale'),
    ('groupe-al-eco-sarl-au-ifrane'),
    ('al-yassir-pro-centre-dakhla'),
    ('al-wifaq-tech-casablanca-group-casablanca'),
    ('al-atlas-telecom-academy-sale'),
    ('al-massar-build-groupe-khemisset'),
    ('tanger-impact-holding-tanger'),
    ('atlas-transport-ltd-nador'),
    ('casaworks-it-groupe-fes'),
    ('al-ibtikar-technologies-tetouan-tetouan'),
    ('al-moutamayyiz-centre-sarl-au-berkane'),
    ('elite-maintenance-services-groupe-sale'),
    ('maroc-maintenance-meknes-meknes'),
    ('groupe-al-fath-smart-sas-berkane'),
    ('al-nour-direct-construction-mohammedia'),
    ('omega-maintenance-services-systems-settat'),
    ('al-waha-digital-ltd-marrakech'),
    ('groupe-al-amal-nova-co-mohammedia'),
    ('groupe-dar-al-sud-sarl-guelmim'),
    ('groupe-al-waha-care-sarl-au-el-jadida'),
    ('sahara-construction-sas-casablanca'),
    ('groupe-atlas-tech-sa-nador'),
    ('al-fath-it-universite-privee-taza'),
    ('groupe-dar-al-marina-sarl-rabat'),
    ('groupe-sahara-city-ltd-safi'),
    ('maroc-media-securite-ltd-rabat'),
    ('dar-media-universite-privee-kenitra'),
    ('al-ibtikar-market-errachidia-errachidia'),
    ('al-telecom-partners-khouribga'),
    ('rif-tech-casablanca-store-casablanca'),
    ('al-kheir-engineering-industries-khemisset'),
    ('al-atlas-transport-ltd-rabat'),
    ('amzigh-royal-trading-berkane'),
    ('global-store-tanger-tanger'),
    ('nova-industries-guelmim-guelmim'),
    ('omega-build-mohammedia-universite-privee-mohammedia'),
    ('rabat-fusion-resort-nador'),
    ('marocain-security-services-groupe-khemisset'),
    ('al-waha-express-mohammedia-pharma-mohammedia'),
    ('al-wifaq-nettoyage-settat-settat'),
    ('sahara-media-ksar-el-kebir-engineering-ksar-el-kebir'),
    ('agadir-smart-partners-dakhla'),
    ('groupe-elite-plus-sarl-au-el-jadida'),
    ('al-amal-foods-ltd-agadir'),
    ('atlas-nettoyage-guelmim-guelmim'),
    ('al-amal-legal-services-logistique-kenitra'),
    ('rabat-partners-kenitra-kenitra'),
    ('agadir-group-temara-temara'),
    ('omega-maintenance-services-resort-ifrane'),
    ('groupe-al-waha-city-sa-settat'),
    ('sahara-express-engineering-tetouan'),
    ('dar-innov-agadir-academy-agadir'),
    ('al-amal-tech-resort-errachidia'),
    ('al-bahja-legal-services-clinic-ksar-el-kebir'),
    ('al-nour-securite-sa-marrakech'),
    ('al-maghrib-consulting-taza-taza'),
    ('al-atlas-smart-partenaires-nador'),
    ('al-tech-rabat-technologies-rabat'),
    ('elite-transport-oujda-oujda'),
    ('casaworks-smart-khouribga-solutions-khouribga'),
    ('groupe-solutions-ltd-temara'),
    ('groupe-maghreb-pro-sa-agadir'),
    ('al-digital-casablanca-casablanca'),
    ('maroc-pro-settat-conseil-settat'),
    ('vertex-fusion-hotel-dakhla'),
    ('fes-nova-logistique-guelmim'),
    ('al-maghrib-consulting-industry-ouarzazate')
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

-- Generate 10-12 reviews per company
rows_plan as (
  select
    c.business_id,
    c.name,
    c.city,
    c.category,
    gs.n as idx,
    c.business_id || ':' || lpad(gs.n::text, 2, '0') as seed_base
  from companies c
  cross join generate_series(1, 12) as gs(n)
),

-- Generate deterministic hashes
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

-- Moroccan names (32 NEW names - different from v4/v5)
moroccan_names as (
  select *
  from (
    values
      (0, 'Nabil'), (1, 'Samira'), (2, 'Kamal'), (3, 'Houda'),
      (4, 'Fouad'), (5, 'Mouna'), (6, 'Adil'), (7, 'Laila'),
      (8, 'Hamid'), (9, 'Fatimae'), (10, 'Anas'), (11, 'Salma'),
      (12, 'Youness'), (13, 'Amina'), (14, 'Soufiane'), (15, 'Khadija'),
      (16, 'Amal'), (17, 'Othmane'), (18, 'Imane'), (19, 'Karim'),
      (20, 'Zineb'), (21, 'Hamza'), (22, 'Fatima'), (23, 'Tariq'),
      (24, 'Sara'), (25, 'Idriss'), (26, 'Marwane'), (27, 'Ghita'),
      (28, 'Ayman'), (29, 'Kenza'), (30, 'Oussama'), (31, 'Rania')
  ) as t(idx, first_name)
),

-- Last initials (8 options - NEW)
last_initials as (
  select *
  from (
    values (0, 'C.'), (1, 'N.'), (2, 'P.'), (3, 'V.'),
           (4, 'M.'), (5, 'G.'), (6, 'Q.'), (7, 'L.')
  ) as t(idx, initial)
),

-- TITLES - 40 options (NEW vocabulary)
titles as (
  select *
  from (
    values
      -- Negative titles (0-9)
      (0, 'Expérience à oublier'),
      (1, 'Très déçu de cette structure'),
      (2, 'À fuire absolument'),
      (3, 'Grosse erreur de parcours'),
      (4, 'Déception totale'),
      (5, 'Environnement malsain'),
      (6, 'Conditions inacceptables'),
      (7, 'Management toxique'),
      (8, 'Je le déconseille'),
      (9, 'Perte de temps'),
      -- Mixed titles (10-19)
      (10, 'Expérience en demi-teinte'),
      (11, 'Bilan contrasté'),
      (12, 'Du positif et du négatif'),
      (13, 'Résultats mitigés'),
      (14, 'Points forts et faiblesses'),
      (15, 'Ni bon ni mauvais'),
      (16, 'Ca reste correct'),
      (17, 'Quelques satisfactions'),
      (18, 'Pour démarrer uniquement'),
      (19, 'A peser le pour et le contre'),
      -- Positive titles (20-39)
      (20, 'Bonne expérience globale'),
      (21, 'Entreprise sérieuse'),
      (22, 'Travail intéressant'),
      (23, 'Bonne ambiance d équipe'),
      (24, 'Parcours enrichissant'),
      (25, 'Je recommande'),
      (26, 'Structure professionnelle'),
      (27, 'Environnement stimulant'),
      (28, 'Bonne qualité de management'),
      (29, 'Expérience positive'),
      (30, 'Équipe compétente'),
      (31, 'Conditions de travail correctes'),
      (32, 'Bonne culture d entreprise'),
      (33, 'Opportunités d évolution'),
      (34, 'Mission formatrice'),
      (35, 'Cadre de travail agréable'),
      (36, 'Bonne intégration'),
      (37, 'Management accessible'),
      (38, 'Vraie opportunité'),
      (39, 'Excellente expérience')
  ) as t(idx, title)
),

-- NEGATIVE OPENINGS (50 options - NEW)
neg_open as (
  select *
  from (
    values
      (0, 'Je regrette vraiment d avoir rejoint cette entreprise.'),
      (1, 'Mon passage ici a été une erreur que je ne referai pas.'),
      (2, 'Les conditions de travail sont déplorables.'),
      (3, 'Je suis ressorti épuisé et démotivé de cette expérience.'),
      (4, 'Cette entreprise ne respecte pas ses employés.'),
      (5, 'L ambiance de travail est exécrable.'),
      (6, 'Je déconseille fortement cette structure.'),
      (7, 'Aucune considération pour le bien-être des employés.'),
      (8, 'Le management est incompétent et irrespectueux.'),
      (9, 'J ai perdu mon temps dans cette entreprise.'),
      (10, 'Les promesses d embauche n ont jamais été tenues.'),
      (11, 'La charge de travail est inhumaine.'),
      (12, 'On est traité comme des machines pas comme des humains.'),
      (13, 'Aucune reconnaissance pour le travail fourni.'),
      (14, 'L organisation est chaotique et inefficace.'),
      (15, 'Je suis soulagé d avoir quitté cette structure.'),
      (16, 'Les managers humilient les employés en public.'),
      (17, 'Pas d évolution possible ni de perspective.'),
      (18, 'Le salaire ne justifie pas les conditions.'),
      (19, 'Tourner la page a été mon meilleur décision.'),
      (20, 'Je n ai jamais connu un tel manque de respect.'),
      (21, 'Les horaires sont imposés sans concertation.'),
      (22, 'L entreprise profite de la précarité des employés.'),
      (23, 'Aucune valeur humaine dans cette structure.'),
      (24, 'J aurais dû écouter les avis négatifs.'),
      (25, 'Le turnover élevé parle de lui même.'),
      (26, 'Micro-management étouffant au quotidien.'),
      (27, 'Les feedbacks sont rares et toujours négatifs.'),
      (28, 'Impossible de s épanouir dans ce contexte.'),
      (29, 'L entreprise ne tient aucune de ses promesses.'),
      (30, 'Je plains ceux qui sont encore coincés là.'),
      (31, 'Direction déconnectée de la réalité du terrain.'),
      (32, 'Ressources insuffisantes et délais impossibles.'),
      (33, 'Trop de favoritisme et d injustice.'),
      (34, 'Les employés compétents s en vont.'),
      (35, 'Aucune écoute pour les problèmes remontés.'),
      (36, 'Culture du blâme permanente.'),
      (37, 'Travail le week-end imposé sans compensation.'),
      (38, 'L entreprise ne forme pas ses employés.'),
      (39, 'Les objectifs sont inatteignables par design.'),
      (40, 'J ai perdu confiance en moi à cause de ce management.'),
      (41, 'Pas de transparence sur les décisions.'),
      (42, 'Les augmentations sont inexistantes.'),
      (43, 'Promotions données aux mauvaises personnes.'),
      (44, 'Environnement hostile et compétition malsaine.'),
      (45, 'Cette expérience m a servi de leçon.'),
      (46, 'Je ne recommande à personne de venir ici.'),
      (47, 'Les outils de travail sont obsolètes.'),
      (48, 'Trop de politique interne et de clans.'),
      (49, 'Fuyez tant que vous le pouvez.')
  ) as t(idx, sentence)
),

-- NEGATIVE MIDDLES (50 options - NEW)
neg_mid as (
  select *
  from (
    values
      (0, 'Les heures supplémentaires ne sont jamais payées.'),
      (1, 'Personne n assume la responsabilité des erreurs.'),
      (2, 'Les managers changent les règles constamment.'),
      (3, 'Aucune communication sur les projets en cours.'),
      (4, 'Les employés sont mis en concurrence.'),
      (5, 'Les processus sont kafkaïens et lents.'),
      (6, 'La direction ne connaît pas le travail de terrain.'),
      (7, 'Les réunions sont une perte de temps.'),
      (8, 'Pas de matériel adapté pour travailler correctement.'),
      (9, 'Les décisions sont prises sans concertation.'),
      (10, 'L ambiance est froide et hostile.'),
      (11, 'Les salaires sont en dessous du marché.'),
      (12, 'Aucune possibilité de télétravail.'),
      (13, 'Les congés sont refusés systématiquement.'),
      (14, 'Trop de reporting improductif.'),
      (15, 'Les clients se plaignent mais rien ne change.'),
      (16, 'Les managers ne sont pas formés pour encadrer.'),
      (17, 'L entreprise ne sait pas retenir les talents.'),
      (18, 'Les equipes sont sous-effectives.'),
      (19, 'Pas de vision claire pour l avenir.'),
      (20, 'La charge administrative est écrasante.'),
      (21, 'Les outils informatiques datent des années 2000.'),
      (22, 'Aucune reconnaissance pour les efforts fournis.'),
      (23, 'Les promesses de prime ne sont jamais tenues.'),
      (24, 'Le stress est permanent.'),
      (25, 'Les objectifs sont flous et changeants.'),
      (26, 'Pas d accompagnement pour les nouveaux.'),
      (27, 'L information circule mal.'),
      (28, 'Trop de niveaux hiérarchiques.'),
      (29, 'Les performeurs sont exploités.'),
      (30, 'Les méthodes de travail sont archaïques.'),
      (31, 'Aucune innovation ni amélioration.'),
      (32, 'Les managers critiquent mais ne félicitent jamais.'),
      (33, 'L entreprise vit sur ses acquis.'),
      (34, 'Pas de budget pour les formations.'),
      (35, 'Les conditions de sécurité sont limites.'),
      (36, 'Trop de paperasse pour pas grand chose.'),
      (37, 'Les plannings changent du jour au lendemain.'),
      (38, 'Aucune considération pour la vie personnelle.'),
      (39, 'Les employés sont jetables.'),
      (40, 'La direction est dans une tour d ivoire.'),
      (41, 'Les processus qualité sont inexistants.'),
      (42, 'Trop de politics et pas assez de travail.'),
      (43, 'Les managers ne font que déléguer.'),
      (44, 'Pas de perspective de carrière.'),
      (45, 'L entreprise ne s adapte pas au changement.'),
      (46, 'Les réunions s éternisent sans résultats.'),
      (47, 'Aucun retour sur les performances.'),
      (48, 'Les meilleurs partent les mauvais restent.'),
      (49, 'Trop de pression pour pas de reconnaissance.')
  ) as t(idx, sentence)
),

-- NEGATIVE CLOSINGS (40 options - NEW)
neg_close as (
  select *
  from (
    values
      (0, 'Je déconseille à 100% cette entreprise.'),
      (1, 'Fuyez cette structure sans hésitation.'),
      (2, 'Allez voir ailleurs il y a bien mieux.'),
      (3, 'Gardez vos attentes très basses si vous rejoignez.'),
      (4, 'Cette entreprise m a fait perdre ma motivation.'),
      (5, 'Je ne reviendrais pour rien au monde.'),
      (6, 'Le marché offre bien mieux que ça.'),
      (7, 'Je suis heureux d en être parti.'),
      (8, 'Ne faites pas la même erreur que moi.'),
      (9, 'Tournez-vous vers d autres opportunités.'),
      (10, 'Cette expérience restera un mauvais souvenir.'),
      (11, 'Je plains ceux qui y sont encore.'),
      (12, 'L entreprise ne mérite pas votre talent.'),
      (13, 'Allez ailleurs pour votre carrière.'),
      (14, 'Ma seule bonne décision a été de partir.'),
      (15, 'A éviter absolument.'),
      (16, 'Je ne comprends pas les avis positifs.'),
      (17, 'Cette structure est une impasse.'),
      (18, 'Partir m a libéré.'),
      (19, 'Je ne recommande sous aucun prétexte.'),
      (20, 'Il existe tellement mieux ailleurs.'),
      (21, 'Mon seul regret est d être resté trop longtemps.'),
      (22, 'Cette entreprise est un gouffre.'),
      (23, 'Fuyez pour votre santé mentale.'),
      (24, 'Je ne ferai plus jamais cette erreur.'),
      (25, 'Cette expérience m a servi de leçon.'),
      (26, 'Tournez la page comme j ai pu le faire.'),
      (27, 'Ne perdez pas votre temps ici.'),
      (28, 'L herbe est plus verte ailleurs.'),
      (29, 'Je suis soulagé d avoir tourné la page.'),
      (30, 'Vous méritez mieux que ça.'),
      (31, 'Ne croyez pas les belles promesses.'),
      (32, 'Il y a des entreprises qui respectent leurs employés.'),
      (33, 'Cherchez ailleurs pour votre bien.'),
      (34, 'Cette entreprise est une erreur de parcours.'),
      (35, 'Je suis content d avoir pris la décision de partir.'),
      (36, 'Les meilleurs conseils partent avec les employés.'),
      (37, 'Ne gâchez pas votre carrière ici.'),
      (38, 'Il y a de meilleures opportunités dehors.'),
      (39, 'Mon passage ici a été un calvaire.')
  ) as t(idx, sentence)
),

-- MIXED OPENINGS (30 options - NEW)
mix_open as (
  select *
  from (
    values
      (0, 'Mon expérience a été en demi-teinte.'),
      (1, 'Des hauts et des bas dans l ensemble.'),
      (2, 'Le bilan est mitigé.'),
      (3, 'J en retiens du positif et du négatif.'),
      (4, 'L expérience a été correcte sans plus.'),
      (5, 'Des points forts mais aussi des faiblesses.'),
      (6, 'Ça a commencé bien puis s est dégradé.'),
      (7, 'Je suis ni pleinement satisfait ni déçu.'),
      (8, 'Quelques satisfactions mais des frustrations aussi.'),
      (9, 'Expérience moyenne dans l ensemble.'),
      (10, 'Des aspects positifs gâchés par des problèmes.'),
      (11, 'Le positif ne compense pas toujours le négatif.'),
      (12, 'Mon avis est partagé.'),
      (13, 'Certaines choses bien d autres moins.'),
      (14, 'Une expérience en clair-obscur.'),
      (15, 'J ai des sentiments contrastés.'),
      (16, 'L entreprise a du potentiel mais des lacunes.'),
      (17, 'Des débuts prometteurs non concrétisés.'),
      (18, 'Expérience correcte pour un premier emploi.'),
      (19, 'Convient pour démarrer pas pour rester.'),
      (20, 'Les conditions se sont dégradées avec le temps.'),
      (21, 'J ai appris des choses mais dans la difficulté.'),
      (22, 'Un parcours en dents de scie.'),
      (23, 'L ambiance était bien au début puis moins.'),
      (24, 'Je suis ressorti avec un sentiment mitigé.'),
      (25, 'Des moments positifs et d autres difficiles.'),
      (26, 'L expérience a été ce qu elle a été.'),
      (27, 'Ni catastrophe ni réussite.'),
      (28, 'Pour certains profils ça peut coller.'),
      (29, 'À chacun de se faire son opinion.')
  ) as t(idx, sentence)
),

-- MIXED MIDDLES (30 options - NEW)
mix_mid as (
  select *
  from (
    values
      (0, 'L équipe est sympa mais le management laisse à désirer.'),
      (1, 'Les missions sont intéressantes mais mal payées.'),
      (2, 'L ambiance est bonne mais les moyens manquent.'),
      (3, 'Les collègues sont agréables mais l organisation est le chaos.'),
      (4, 'Le travail est varié mais la charge est lourde.'),
      (5, 'L intégration est bien faite mais l évolution est bloquée.'),
      (6, 'Les formations existent mais sont mal ciblées.'),
      (7, 'L autonomie est présente mais sans guidage.'),
      (8, 'Le manager est accessible mais peu décisionnaire.'),
      (9, 'Les avantages sont là mais le salaire est juste.'),
      (10, 'L équilibre vie pro vie perso est variable.'),
      (11, 'Les processus existent mais ne sont pas suivis.'),
      (12, 'La culture est présente mais pas vécue.'),
      (13, 'Les outils sont là mais pas adaptés.'),
      (14, 'Les feedbacks sont utiles mais trop rares.'),
      (15, 'L encadrement est là mais de qualité variable.'),
      (16, 'La communication existe mais manque de transparence.'),
      (17, 'Les perspectives sont là mais floues.'),
      (18, 'L entreprise est stable mais n innove pas.'),
      (19, 'Les horaires sont flexibles mais la charge importante.'),
      (20, 'L équipe est compétente mais sous pression.'),
      (21, 'Le travail a du sens mais les conditions se dégradent.'),
      (22, 'L expérience est enrichissante mais épuisante.'),
      (23, 'Les missions sont correctes mais répétitives.'),
      (24, 'L environnement est pro mais froid.'),
      (25, 'La reconnaissance existe mais arrive tard.'),
      (26, 'Les moyens sont corrects mais mal répartis.'),
      (27, 'L accompagnement existe mais est insuffisant.'),
      (28, 'Les responsabilités sont là mais pas la confiance.'),
      (29, 'L entreprise a du potentiel non réalisé.')
  ) as t(idx, sentence)
),

-- MIXED CLOSINGS (30 options - NEW)
mix_close as (
  select *
  from (
    values
      (0, 'Dans l ensemble une expérience correcte.'),
      (1, 'Je recommande avec quelques réserves.'),
      (2, 'À considérer en connaissance de cause.'),
      (3, 'Pour un premier emploi ça passe.'),
      (4, 'Le bilan est neutre.'),
      (5, 'À essayer pour se faire son avis.'),
      (6, 'Convient pour débuter pas pour faire carrière.'),
      (7, 'Du positif malgré les défauts.'),
      (8, 'Je ne recommande ni ne déconseille.'),
      (9, 'À chacun de voir si ça lui correspond.'),
      (10, 'Pour ceux qui cherchent juste de la stabilité.'),
      (11, 'Les points positifs n effacent pas les négatifs.'),
      (12, 'Une fois peut être mais pas plus.'),
      (13, 'Ni pleinement satisfait ni vraiment déçu.'),
      (14, 'Je reste prudent dans mon avis.'),
      (15, 'Malgré les défauts j en retiens du positif.'),
      (16, 'À peser le pour et le contre.'),
      (17, 'Pour certains profils ça peut matcher.'),
      (18, 'Tout dépend de votre manager direct.'),
      (19, 'J en garde des choses utiles malgré tout.'),
      (20, 'Une expérience acceptable sur le CV.'),
      (21, 'Je ne suis pas mécontent d être parti cependant.'),
      (22, 'Les conditions actuelles rendent l avis mitigé.'),
      (23, 'À surveiller l évolution avant de postuler.'),
      (24, 'Je ne m étendrai pas plus.'),
      (25, 'Peut mieux faire avec les bons changements.'),
      (26, 'L expérience moyenne reste une expérience.'),
      (27, 'À moitié satisfait c est déjà quelque chose.'),
      (28, 'Le positif existe il faut le reconnaître.'),
      (29, 'À vous de juger.')
  ) as t(idx, sentence)
),

-- POSITIVE OPENINGS (50 options - NEW)
pos_open as (
  select *
  from (
    values
      (0, 'Mon expérience a été très positive.'),
      (1, 'Je suis satisfait de mon parcours ici.'),
      (2, 'L entreprise m a offert de belles opportunités.'),
      (3, 'L accueil a été excellent dès le début.'),
      (4, 'J ai trouvé un environnement professionnel sérieux.'),
      (5, 'Mon passage ici a boosté ma carrière.'),
      (6, 'L équipe est dynamique et bienveillante.'),
      (7, 'Je recommande cette entreprise.'),
      (8, 'Les conditions de travail sont bonnes.'),
      (9, 'J ai pu développer mes compétences.'),
      (10, 'L encadrement est de qualité.'),
      (11, 'L ambiance de travail est saine.'),
      (12, 'Cette structure investit dans ses employés.'),
      (13, 'Je suis reconnaissant pour cette opportunité.'),
      (14, 'L entreprise mérite sa bonne réputation.'),
      (15, 'Mon expérience a dépassé mes attentes.'),
      (16, 'J ai apprécié l autonomie accordée.'),
      (17, 'Le management est à l écoute.'),
      (18, 'Les missions sont stimulantes.'),
      (19, 'L intégration a été bien organisée.'),
      (20, 'J ai trouvé un bon équilibre de vie.'),
      (21, 'L entreprise valorise le mérite.'),
      (22, 'Mon parcours a été jalonné de réussites.'),
      (23, 'L esprit d équipe est remarquable.'),
      (24, 'Les perspectives d évolution sont réelles.'),
      (25, 'J ai pu construire une vraie expertise.'),
      (26, 'L accompagnement est personnalisé.'),
      (27, 'Les valeurs de l entreprise sont réelles.'),
      (28, 'J ai pris beaucoup de plaisir à travailler ici.'),
      (29, 'L organisation est efficace.'),
      (30, 'Les formations sont pertinentes.'),
      (31, 'Le dialogue avec la direction est ouvert.'),
      (32, 'L entreprise fait confiance à ses employés.'),
      (33, 'J ai été bien intégré dès mon arrivée.'),
      (34, 'Les conditions matérielles sont bonnes.'),
      (35, 'L innovation est encouragée.'),
      (36, 'La reconnaissance est présente.'),
      (37, 'J ai trouvé un cadre stimulant.'),
      (38, 'L entreprise sait tirer parti des talents.'),
      (39, 'Les feedbacks sont constructifs.'),
      (40, 'J ai pu m épanouir professionnellement.'),
      (41, 'Le management fait la différence.'),
      (42, 'Les projets sont variés et intéressants.'),
      (43, 'L entreprise communique clairement.'),
      (44, 'J ai apprécié la culture d entreprise.'),
      (45, 'L équilibre vie pro vie perso est respecté.'),
      (46, 'Les moyens sont au rendez-vous.'),
      (47, 'L entreprise reconnaît les performeurs.'),
      (48, 'Je garde un excellent souvenir.'),
      (49, 'C est une bonne adresse pour sa carrière.')
  ) as t(idx, sentence)
),

-- POSITIVE MIDDLES (50 options - NEW)
pos_mid as (
  select *
  from (
    values
      (0, 'Les collègues sont compétents et solidaires.'),
      (1, 'Le management de proximité est efficace.'),
      (2, 'Les objectifs sont clairs et atteignables.'),
      (3, 'L autonomie favorise la prise d initiative.'),
      (4, 'L ambiance conviviale reste professionnelle.'),
      (5, 'Les outils de travail sont modernes.'),
      (6, 'La communication est fluide.'),
      (7, 'L accompagnement des nouveaux est soigné.'),
      (8, 'Les feedbacks sont réguliers et utiles.'),
      (9, 'L organisation permet d avancer efficacement.'),
      (10, 'La culture d entreprise est forte.'),
      (11, 'Les responsabilités sont bien adaptées.'),
      (12, 'Le management valorise l autonomie.'),
      (13, 'Les conditions matérielles sont excellentes.'),
      (14, 'L entreprise tire parti des talents.'),
      (15, 'Les réunions sont productives.'),
      (16, 'L innovation est encouragée.'),
      (17, 'La collaboration entre équipes fonctionne.'),
      (18, 'Les technologies sont modernes.'),
      (19, 'Les processus sont clairs.'),
      (20, 'Le partage de connaissances est pratique.'),
      (21, 'L écoute des collaborateurs est réelle.'),
      (22, 'Les défis sont stimulants.'),
      (23, 'L ambiance est humaine.'),
      (24, 'Les managers sont de vrais leaders.'),
      (25, 'La vision est bien communiquée.'),
      (26, 'Les formations sont continues.'),
      (27, 'L évaluation est juste.'),
      (28, 'Le télétravail est possible.'),
      (29, 'Les équipes sont bien dimensionnées.'),
      (30, 'L ancienneté est reconnue.'),
      (31, 'Les managers sont bien formés.'),
      (32, 'L information circule bien.'),
      (33, 'Les projets innovants sont privilégiés.'),
      (34, 'La mobilité interne est facilitée.'),
      (35, 'Le bien-être est pris en compte.'),
      (36, 'Le dialogue social est constructif.'),
      (37, 'Les missions sont adaptées aux talents.'),
      (38, 'La vision long terme est partagée.'),
      (39, 'Les réussites sont célébrées.'),
      (40, 'L environnement est propice à l épanouissement.'),
      (41, 'La reconnaissance est au rendez-vous.'),
      (42, 'Les avantages sociaux sont corrects.'),
      (43, 'L entreprise s adapte aux besoins.'),
      (44, 'Le respect est mutuel.'),
      (45, 'La confiance règne.'),
      (46, 'Les opportunités sont réelles.'),
      (47, 'L entreprise investit dans l avenir.'),
      (48, 'La qualité du travail est valorisée.'),
      (49, 'L esprit d équipe fait la différence.')
  ) as t(idx, sentence)
),

-- POSITIVE CLOSINGS (40 options - NEW)
pos_close as (
  select *
  from (
    values
      (0, 'Je recommande vivement cette entreprise.'),
      (1, 'C est une excellente adresse pour sa carrière.'),
      (2, 'Le bilan est très positif.'),
      (3, 'Je suis fier d avoir fait partie de l équipe.'),
      (4, 'L entreprise a dépassé mes attentes.'),
      (5, 'Je la recommande sans réserve.'),
      (6, 'Une expérience que je ne regrette pas.'),
      (7, 'L entreprise mérite sa réputation.'),
      (8, 'Je suis reconnaissant pour cette opportunité.'),
      (9, 'Un choix que je referai.'),
      (10, 'Idéal pour les profils motivés.'),
      (11, 'Je recommande les yeux fermés.'),
      (12, 'Une aventure professionnelle réussie.'),
      (13, 'Je suis pleinement satisfait.'),
      (14, 'L entreprise valorise ses talents.'),
      (15, 'Mon expérience a été plus que positive.'),
      (16, 'Je garde un excellent souvenir.'),
      (17, 'L entreprise mérite d être connue.'),
      (18, 'Je ne peux que recommander.'),
      (19, 'Le retour d expérience est excellent.'),
      (20, 'C est un excellent choix de carrière.'),
      (21, 'Je suis fier d avoir contribué.'),
      (22, 'L équipe et le management font la différence.'),
      (23, 'Je recommande absolument.'),
      (24, 'Une entreprise à recommander.'),
      (25, 'Le parcours a été une réussite.'),
      (26, 'Je suis enchanté de mon expérience.'),
      (27, 'C est une entreprise qui compte.'),
      (28, 'Je remercie pour cette opportunité.'),
      (29, 'Un passage formateur.'),
      (30, 'L expérience a tenu ses promesses.'),
      (31, 'Je suis comblé par mon parcours.'),
      (32, 'Une entreprise qui fait la différence.'),
      (33, 'J en garde un excellent souvenir.'),
      (34, 'Le bilan est extrêmement positif.'),
      (35, 'C est un modèle dans le secteur.'),
      (36, 'Je suis très satisfait de mon choix.'),
      (37, 'L entreprise a su me convaincre.'),
      (38, 'Je n hésiterai pas à recommander.'),
      (39, 'Une expérience marquante de ma carrière.')
  ) as t(idx, sentence)
),

-- PROS for positive (40 options - NEW)
pros_pos as (
  select *
  from (
    values
      (0, 'Excellente ambiance de travail.'),
      (1, 'Formation continue assurée.'),
      (2, 'Stabilité de l emploi.'),
      (3, 'Avantages sociaux attractifs.'),
      (4, 'Management à l écoute.'),
      (5, 'Projets variés et stimulants.'),
      (6, 'Équilibre vie pro vie perso.'),
      (7, 'Culture d entreprise positive.'),
      (8, 'Environnement de travail moderne.'),
      (9, 'Autonomie et responsabilisation.'),
      (10, 'Reconnaissance du mérite.'),
      (11, 'Évolution de carrière possible.'),
      (12, 'Équipe compétente et solidaire.'),
      (13, 'Conditions matérielles optimales.'),
      (14, 'Ambiance conviviale.'),
      (15, 'Intégration soignée.'),
      (16, 'Confiance et transparence.'),
      (17, 'Communication fluide.'),
      (18, 'Organisation efficace.'),
      (19, 'Missions passionnantes.'),
      (20, 'Encadrement de qualité.'),
      (21, 'Moyens adaptés.'),
      (22, 'Initiatives valorisées.'),
      (23, 'Climat social apaisé.'),
      (24, 'Opportunités de carrière.'),
      (25, 'Management de proximité.'),
      (26, 'Innovation encouragée.'),
      (27, 'Rémunération correcte.'),
      (28, 'Environnement stimulant.'),
      (29, 'Prise d initiative possible.'),
      (30, 'Collègues solidaires.'),
      (31, 'Intégration réussie.'),
      (32, 'Vision claire.'),
      (33, 'Travail en équipe valorisé.'),
      (34, 'Horaires flexibles.'),
      (35, 'Outils performants.'),
      (36, 'Ancienneté reconnue.'),
      (37, 'Atmosphère bienveillante.'),
      (38, 'Support réactif.'),
      (39, 'Mobilité facilitée.')
  ) as t(idx, sentence)
),

-- CONS for all (50 options - NEW)
cons_all as (
  select *
  from (
    values
      (0, 'Processus décisionnels lents.'),
      (1, 'Charge de travail irrégulière.'),
      (2, 'Outils informatiques obsolètes.'),
      (3, 'Communication interne faible.'),
      (4, 'Pression sur les objectifs.'),
      (5, 'Évolution salariale lente.'),
      (6, 'Réunions trop nombreuses.'),
      (7, 'Feedbacks insuffisants.'),
      (8, 'Mobilité interne limitée.'),
      (9, 'Budget formation réduit.'),
      (10, 'Horaires parfois contraignants.'),
      (11, 'Documentation incomplète.'),
      (12, 'Délais de validation longs.'),
      (13, 'Partage d informations limité.'),
      (14, 'Turnover élevé.'),
      (15, 'Coordination inter-équipes faible.'),
      (16, 'Charge administrative lourde.'),
      (17, 'Outils inadaptés.'),
      (18, 'Visibilité sur l évolution absente.'),
      (19, 'Processus bureaucratiques.'),
      (20, 'Ressources insuffisantes.'),
      (21, 'Pratiques non harmonisées.'),
      (22, 'Communication descendante.'),
      (23, 'Approbations lentes.'),
      (24, 'Équilibre vie pro vie perso variable.'),
      (25, 'Système de feedback absent.'),
      (26, 'Partage de pratiques limité.'),
      (27, 'Anticipation des pics déficiente.'),
      (28, 'Processus qualité lourds.'),
      (29, 'Mentoring non structuré.'),
      (30, 'Accès à l information difficile.'),
      (31, 'Parcours de carrière flou.'),
      (32, 'Répartition de charge inégale.'),
      (33, 'Réunions improductives.'),
      (34, 'Onboarding improvisé.'),
      (35, 'Reporting redondant.'),
      (36, 'Transversalité sous-développée.'),
      (37, 'Délais internes longs.'),
      (38, 'Documentation projet absente.'),
      (39, 'Canaux de communication dispersés.'),
      (40, 'Changements constants.'),
      (41, 'Montée en compétence lente.'),
      (42, 'Interlocuteurs difficiles à identifier.'),
      (43, 'Charge imprévisible.'),
      (44, 'Information fragmentée.'),
      (45, 'Processus à validations multiples.'),
      (46, 'Flux de travail manuels.'),
      (47, 'Planification opaque.'),
      (48, 'Application des règles variable.'),
      (49, 'Rétention des talents faible.')
  ) as t(idx, sentence)
),

-- ADVICE (40 options - NEW)
advice as (
  select *
  from (
    values
      (0, 'Repenser les parcours d évolution.'),
      (1, 'Investir dans la formation.'),
      (2, 'Alléger les processus.'),
      (3, 'Privilégier l expérience interne.'),
      (4, 'Généraliser le télétravail.'),
      (5, 'Moderniser les outils.'),
      (6, 'Faciliter la mobilité interne.'),
      (7, 'Mieux répartir la charge.'),
      (8, 'Communiquer sur la stratégie.'),
      (9, 'Revoir la politique salariale.'),
      (10, 'Encourager l innovation.'),
      (11, 'Valoriser l engagement.'),
      (12, 'Structurer le mentoring.'),
      (13, 'Harmoniser les pratiques.'),
      (14, 'Anticiper les périodes chargées.'),
      (15, 'Investir dans le bien-être.'),
      (16, 'Instaurer des feedbacks réguliers.'),
      (17, 'Moderniser l informatique.'),
      (18, 'Faciliter les échanges.'),
      (19, 'Anticiper les pics.'),
      (20, 'Plus de transparence.'),
      (21, 'Proposer des formations ciblées.'),
      (22, 'Accélérer les validations.'),
      (23, 'Valoriser les parcours internes.'),
      (24, 'Centraliser l information.'),
      (25, 'Développer le partage.'),
      (26, 'Capitaliser sur les retours.'),
      (27, 'Renforcer l accompagnement.'),
      (28, 'Optimiser les réunions.'),
      (29, 'Communiquer sur les opportunités.'),
      (30, 'Mieux répartir la charge annuelle.'),
      (31, 'Investir dans des outils intuitifs.'),
      (32, 'Trouver le bon équilibre.'),
      (33, 'Créer des espaces d échange.'),
      (34, 'Suivre les progressions.'),
      (35, 'Simplifier l administratif.'),
      (36, 'Valoriser les initiatives.'),
      (37, 'Développer la culture du feedback.'),
      (38, 'Améliorer la visibilité.'),
      (39, 'Renforcer la coordination.')
  ) as t(idx, sentence)
),

payload as (
  select
    v.business_id,
    format('seed_targeted_v6:%s:review-%s', v.business_id, lpad(v.idx::text, 2, '0')) as moderation_reason_code,
    mn.first_name || ' ' || li.initial as author_name,
    -- Balanced rating: 8% (1★), 10% (2★), 17% (3★), 40% (4★), 25% (5★)
    case
      when (v.h4 % 100) < 8 then 1
      when (v.h4 % 100) < 18 then 2
      when (v.h4 % 100) < 35 then 3
      when (v.h4 % 100) < 75 then 4
      else 5
    end as rating,
    -- Title based on rating
    case
      when (v.h4 % 100) < 8 then t.title    -- negative (0-9)
      when (v.h4 % 100) < 18 then t.title   -- negative (0-9)
      when (v.h4 % 100) < 35 then t.title   -- mixed (10-19)
      else t.title                          -- positive (20-39)
    end as title,
    -- Content based on rating
    case
      when (v.h4 % 100) < 8 then  -- 1 star
        no.sentence || ' ' || nm.sentence || ' ' || nc.sentence
      when (v.h4 % 100) < 18 then  -- 2 stars
        no.sentence || ' ' || nm.sentence || ' ' || nc.sentence
      when (v.h4 % 100) < 35 then  -- 3 stars
        mo.sentence || ' ' || mm.sentence || ' ' || mc.sentence
      else  -- 4-5 stars
        po.sentence || ' ' || pm.sentence || ' ' || pc.sentence
    end as content,
    -- Role based on category
    case
      when v.category ilike '%technologie%' or v.category ilike '%it%' then 
        (array['software-developer','it-support','data-analyst'])[1 + (v.h0 % 3)]
      when v.category ilike '%bpo%' or v.category ilike '%appel%' then 
        (array['customer-advisor','team-leader','quality-analyst'])[1 + (v.h0 % 3)]
      else 
        (array['operations-assistant','project-coordinator','administrative-officer'])[1 + (v.h0 % 3)]
    end as role_slug,
    lower(regexp_replace(v.city, '[^a-zA-Z0-9]+', '-', 'g')) as city_slug,
    case
      when v.category ilike '%technologie%' or v.category ilike '%it%' then 'engineering'
      when v.category ilike '%bpo%' or v.category ilike '%appel%' then 'customer-support'
      else 'operations'
    end as department_slug,
    (array['current','former'])[1 + (v.h2 % 2)] as employment_status,
    (array['lt_6m','6_12m','1_2y','3_5y','gt_5y'])[1 + (v.h3 % 5)] as tenure_band,
    (array['cdi','cdd','other'])[1 + (v.h4 % 3)] as contract_type,
    (array['onsite','hybrid','remote'])[1 + (v.h5 % 3)] as work_mode,
    -- Pros only for positive reviews
    case when (v.h4 % 100) >= 35 then pp.sentence else null end as pros,
    ca.sentence as cons,
    a.sentence as advice_to_management,
    (v.h4 % 100) >= 35 as would_recommend,
    (v.h5 % 100) >= 35 as ceo_approval,
    (date_trunc('month', timezone('utc'::text, now())) - ((12 + v.idx)::text || ' months')::interval)::date as experience_start_month,
    (date_trunc('month', timezone('utc'::text, now())) - ((v.idx % 6 + 1)::text || ' months')::interval)::date as experience_end_month,
    current_date - (v.idx * 7) as date,
    'published'::text as status,
    timezone('utc'::text, now()) - (v.idx || ' days')::interval as published_at,
    jsonb_build_object(
      'seed_batch', 'seed_targeted_v6',
      'seeded', true,
      'index', v.idx
    ) as risk_flags
  from variants v
  join moroccan_names mn on mn.idx = (v.h0 + v.h1) % 32
  join last_initials li on li.idx = v.h2 % 8
  join titles t on t.idx = case
    when (v.h4 % 100) < 18 then v.h0 % 10
    when (v.h4 % 100) < 35 then 10 + (v.h0 % 10)
    else 20 + (v.h0 % 20)
  end
  left join neg_open no on no.idx = v.h0 % 50
  left join neg_mid nm on nm.idx = v.h1 % 50
  left join neg_close nc on nc.idx = v.h2 % 40
  left join mix_open mo on mo.idx = v.h0 % 30
  left join mix_mid mm on mm.idx = v.h1 % 30
  left join mix_close mc on mc.idx = v.h2 % 30
  left join pos_open po on po.idx = v.h0 % 50
  left join pos_mid pm on pm.idx = v.h1 % 50
  left join pos_close pc on pc.idx = v.h2 % 40
  left join pros_pos pp on pp.idx = (v.h3 + v.h4) % 40
  join cons_all ca on ca.idx = (v.h5 + v.h6) % 50
  join advice a on a.idx = (v.h7 + v.h0) % 40
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
  returning id
)
select
  (select count(*) from companies) as targeted_companies,
  (select count(*) from payload) as total_reviews,
  (select count(*) from inserted) as inserted_rows,
  (select count(*) from payload where rating = 1) as rating_1,
  (select count(*) from payload where rating = 2) as rating_2,
  (select count(*) from payload where rating = 3) as rating_3,
  (select count(*) from payload where rating = 4) as rating_4,
  (select count(*) from payload where rating = 5) as rating_5;

commit;

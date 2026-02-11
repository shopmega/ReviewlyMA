
import type { Business, SeasonalCollection } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
    const img = PlaceHolderImages.find((img) => img.id === id);
    if (!img) return PlaceHolderImages[0];
    return img;
};

export const businesses: Business[] = [
    {
        id: 'ocp-group',
        name: 'OCP Group',
        logo: getImage('ocp-logo'), // Fallback likely
        photos: [getImage('ocp-office'), getImage('ocp-plant')],
        category: 'Industrie & Chimie',
        subcategory: 'Extraction Minière',
        location: 'Boulevard Mohamed V, Casablanca',
        city: 'Casablanca',
        quartier: 'Centre Ville',
        description: 'Leader mondial sur le marché des phosphates et produits dérivés. OCP Group est un acteur clé de l\'économie marocaine et offre de nombreuses opportunités de carrière.',
        overallRating: 4.8,
        type: 'company',
        isFeatured: true,
        is_premium: true,
        tier: 'pro',
        website: 'https://www.ocpgroup.ma',
        tags: ['phosphate', 'international', 'chimie', 'innovation'],
        benefits: ['Transport', 'CIMR', 'Assurance Maladie', 'Primes'],
        companySize: '10000+',
        reviews: [
            {
                id: 1,
                rating: 5,
                title: 'Une fierté nationale',
                text: 'Travailler chez OCP est une opportunité unique. Les projets sont d\'envergure internationale et les conditions de travail sont excellentes.',
                author: 'Ingénieur Process',
                date: '2024-01-15',
                likes: 45,
                dislikes: 2,
                subRatings: { workLifeBalance: 4, management: 5, careerGrowth: 5, culture: 5 }
            },
            {
                id: 2,
                rating: 4,
                title: 'Bonne école',
                text: 'Idéal pour commencer sa carrière avec des standards élevés. Parfois la charge de travail est intense.',
                author: 'Analyste Junior',
                date: '2023-11-30',
                likes: 20,
                dislikes: 1,
                subRatings: { workLifeBalance: 3, management: 4, careerGrowth: 5, culture: 4 }
            }
        ],
        updates: [
            {
                id: 1,
                title: 'Lancement du programme Mzinda',
                text: 'Nous inaugurons notre nouveau pôle technologique à Benguerir pour accélérer la recherche en agriculture durable.',
                date: '2024-02-01'
            }
        ]
    },
    {
        id: 'maroc-telecom',
        name: 'Maroc Telecom',
        logo: getImage('iam-logo'),
        photos: [getImage('iam-tower')],
        category: 'Télécommunications',
        subcategory: 'Opérateur',
        location: 'Avenue Annakhil, Hay Riad, Rabat',
        city: 'Rabat',
        quartier: 'Hay Riad',
        description: 'Opérateur historique de télécommunications au Maroc, offrant des services de téléphonie mobile, fixe et internet.',
        overallRating: 4.5,
        type: 'company',
        isFeatured: true,
        website: 'https://www.iam.ma',
        tags: ['telecom', 'mobile', 'internet', 'leader'],
        benefits: ['CIMR', 'Mutuelle', 'Convention'],
        companySize: '5000-10000',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Stabilité et avantages',
                text: 'Entreprise très stable avec de bons avantages sociaux. L\'ambiance dépend beaucoup des départements.',
                author: 'Cadre Commercial',
                date: '2023-12-10',
                likes: 32,
                dislikes: 5,
                subRatings: { workLifeBalance: 4, management: 3, careerGrowth: 4, culture: 3 }
            }
        ]
    },
    {
        id: 'attijariwafa-bank',
        name: 'Attijariwafa Bank',
        logo: getImage('awb-logo'),
        photos: [getImage('awb-headquarters')],
        category: 'Banque & Finance',
        subcategory: 'Banque',
        location: 'Boulevard Moulay Youssef, Casablanca',
        city: 'Casablanca',
        quartier: 'Centre Ville',
        description: 'Premier groupe bancaire et financier du Maghreb. Nous accompagnons le développement économique du continent.',
        overallRating: 4.6,
        type: 'company',
        isFeatured: true,
        website: 'https://www.attijariwafabank.com',
        tags: ['banque', 'finance', 'afrique'],
        benefits: ['Taux préférentiels', 'Assurance Groupe', 'Formation'],
        companySize: '10000+',
        reviews: [
            {
                id: 1,
                rating: 5,
                title: 'Carrière dynamique',
                text: 'Beaucoup d\'opportunités de mobilité interne et vers les filiales en Afrique.',
                author: 'Chef de projet',
                date: '2024-02-15',
                likes: 28,
                dislikes: 0,
                subRatings: { workLifeBalance: 3, management: 5, careerGrowth: 5, culture: 4 }
            }
        ]
    },
    {
        id: 'cgi-maroc',
        name: 'CGI Maroc',
        logo: getImage('cgi-logo'),
        photos: [getImage('cgi-office')],
        category: 'Technologie & IT',
        subcategory: 'ESN / Consulting',
        location: 'Casanearshore Park, Casablanca',
        city: 'Casablanca',
        quartier: 'Sidi Maarouf',
        description: 'Filiale de CGI Inc., nous sommes un leader mondial du conseil en technologie de l\'information.',
        overallRating: 4.3,
        type: 'company',
        tier: 'growth',
        website: 'https://www.cgi.com/maroc',
        tags: ['it', 'consulting', 'dev', 'digital'],
        benefits: ['Télétravail', 'Certifications', 'Tickets resto'],
        companySize: '1000-5000',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Bon environnement technique',
                text: 'On travaille sur des projets intéressants pour des clients internationaux. Le télétravail est un vrai plus.',
                author: 'Développeur Fullstack',
                date: '2023-10-22',
                likes: 15,
                dislikes: 1,
                subRatings: { workLifeBalance: 5, management: 4, careerGrowth: 4, culture: 4 }
            }
        ]
    },
    {
        id: 'royal-air-maroc',
        name: 'Royal Air Maroc',
        logo: getImage('ram-logo'),
        photos: [getImage('ram-plane')],
        category: 'Transport & Logistique',
        subcategory: 'Aérien',
        location: 'Aéroport Casa-Anfa, Casablanca',
        city: 'Casablanca',
        quartier: 'Hay Hassani',
        description: 'Compagnie aérienne nationale du Maroc, reliant le Royaume au reste du monde.',
        overallRating: 4.2,
        type: 'company',
        website: 'https://www.royalairmaroc.com',
        tags: ['transport', 'voyage', 'aérien'],
        companySize: '1000-5000',
        reviews: [
            {
                id: 1,
                rating: 5,
                title: 'Fière de porter l\'uniforme',
                text: 'Une expérience enrichissante permettant de voyager et de rencontrer des gens du monde entier.',
                author: 'Personnel Navigant',
                date: '2023-09-15',
                likes: 50,
                dislikes: 3,
                subRatings: { workLifeBalance: 2, management: 4, careerGrowth: 4, culture: 5 }
            }
        ]
    },
    {
        id: 'intelcia-group',
        name: 'Intelcia',
        logo: getImage('intelcia-logo'),
        photos: [getImage('intelcia-office')],
        category: 'Centres d’Appel & BPO',
        subcategory: 'Outsourcing',
        location: 'Casanearshore, Casablanca',
        city: 'Casablanca',
        quartier: 'Sidi Maarouf',
        description: 'Acteur global de l\'outsourcing, présent dans plus de 16 pays.',
        overallRating: 4.1,
        type: 'company',
        website: 'https://www.intelcia.com',
        tags: ['crm', 'outsourcing', 'service-client'],
        companySize: '10000+',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Bonne première expérience',
                text: 'Formation complète et ambiance jeune. Parfait pour débuter.',
                author: 'Conseiller Client',
                date: '2024-01-05',
                likes: 12,
                dislikes: 2,
                subRatings: { workLifeBalance: 3, management: 4, careerGrowth: 3, culture: 5 }
            }
        ]
    },
    {
        id: 'cdg-capital',
        name: 'CDG Capital',
        logo: getImage('cdg-logo'),
        photos: [getImage('cdg-building')],
        category: 'Banque & Finance',
        subcategory: 'Banque d\'investissement',
        location: 'Ryad Center, Rabat',
        city: 'Rabat',
        quartier: 'Hay Riad',
        description: 'Banque de financement et d\'investissement du groupe CDG (Caisse de Dépôt et de Gestion).',
        overallRating: 4.7,
        type: 'company',
        isFeatured: true,
        website: 'https://www.cdgcapital.ma',
        tags: ['finance', 'investissement', 'prestige'],
        companySize: '500-1000',
        reviews: [
            {
                id: 1,
                rating: 5,
                title: 'Excellence et Rigueur',
                text: 'Environnement de travail stimulant intellectuellement avec des profils de haut niveau.',
                author: 'Analyste Financier',
                date: '2024-03-01',
                likes: 18,
                dislikes: 0,
                subRatings: { workLifeBalance: 3, management: 5, careerGrowth: 5, culture: 4 }
            }
        ]
    },
    {
        id: 'capgemini-engineering',
        name: 'Capgemini Engineering',
        logo: getImage('capgemini-logo'),
        photos: [getImage('capgemini-office')],
        category: 'Technologie & IT',
        subcategory: 'R&D',
        location: 'Technopolis, Rabat',
        city: 'Rabat',
        quartier: 'Sala Al Jadida',
        description: 'Leader mondial des services d\'ingénierie et de R&D.',
        overallRating: 4.4,
        type: 'company',
        website: 'https://www.capgemini.com',
        tags: ['ingénierie', 'auto', 'aéro', 'tech'],
        companySize: '1000-5000',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Projets innovants',
                text: 'On travaille sur les voitures de demain. Passionnant pour les ingénieurs.',
                author: 'Ingénieur R&D',
                date: '2023-12-20',
                likes: 22,
                dislikes: 1,
                subRatings: { workLifeBalance: 4, management: 4, careerGrowth: 5, culture: 4 }
            }
        ]
    },
    {
        id: 'labelvie-group',
        name: 'LabelVie Group',
        logo: getImage('labelvie-logo'),
        photos: [getImage('labelvie-store')],
        category: 'Distribution & Commerce',
        subcategory: 'Grande Distribution',
        location: 'Route de Médiouna, Casablanca',
        city: 'Casablanca',
        quartier: 'Ain Chock',
        description: 'Groupe leader de la grande distribution au Maroc (Carrefour, Carrefour Market, Atacado).',
        overallRating: 4.0,
        type: 'company',
        website: 'https://www.labelvie.ma',
        tags: ['retail', 'logistique', 'management'],
        companySize: '5000-10000',
        reviews: [
            {
                id: 1,
                rating: 3,
                title: 'École du terrain',
                text: 'Très formateur mais les horaires sont difficiles en magasin.',
                author: 'Manager de Rayon',
                date: '2023-11-15',
                likes: 10,
                dislikes: 4,
                subRatings: { workLifeBalance: 2, management: 4, careerGrowth: 4, culture: 3 }
            }
        ]
    },
    {
        id: 'inwi',
        name: 'Inwi',
        logo: getImage('inwi-logo'),
        photos: [getImage('inwi-hq'), getImage('inwi-office-1'), getImage('inwi-office-2')],
        category: 'Télécommunications',
        subcategory: 'Opérateur Global',
        location: 'Zénith Millenium, Casablanca',
        city: 'Casablanca',
        quartier: 'Sidi Maarouf',
        description: 'Opérateur global de télécommunications et digitale au Maroc.',
        overallRating: 4.2,
        type: 'company',
        website: 'https://www.inwi.ma',
        tags: ['telecom', 'digital', 'innovation'],
        companySize: '1000-5000',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Culture jeune',
                text: 'Ambiance dynamique et projets digitaux innovants.',
                author: 'Digital Manager',
                date: '2024-01-20',
                likes: 25,
                dislikes: 1,
                subRatings: { workLifeBalance: 4, management: 4, careerGrowth: 4, culture: 5 }
            }
        ]
    },
    {
        id: 'managem-group',
        name: 'Managem',
        logo: getImage('managem-logo'),
        photos: [getImage('managem-site'), getImage('managem-lab')],
        category: 'Industrie & Chimie',
        subcategory: 'Mines',
        location: 'Twin Center, Casablanca',
        city: 'Casablanca',
        quartier: 'Maarif',
        description: 'Groupe minier marocain à vocation internationale.',
        overallRating: 4.1,
        type: 'company',
        website: 'https://www.managemgroup.com',
        tags: ['mines', 'industrie', 'international'],
        companySize: '5000-10000',
        reviews: [
            {
                id: 1,
                rating: 4,
                title: 'Carrière internationale',
                text: 'Possibilité de travailler sur des sites en Afrique.',
                author: 'Géologue',
                date: '2023-11-10',
                likes: 15,
                dislikes: 0,
                subRatings: { workLifeBalance: 2, management: 4, careerGrowth: 5, culture: 4 }
            }
        ]
    },
    {
        id: 'ctm-maroc',
        name: 'CTM',
        logo: getImage('ctm-logo'),
        photos: [getImage('ctm-bus'), getImage('ctm-station')],
        category: 'Transport & Logistique',
        subcategory: 'Transport Routier',
        location: 'Autoroute de Casablanca, Sidi Bernoussi',
        city: 'Casablanca',
        quartier: 'Sidi Bernoussi',
        description: 'Leader du transport routier de voyageurs et de messagerie au Maroc.',
        overallRating: 3.9,
        type: 'company',
        website: 'https://www.ctm.ma',
        tags: ['transport', 'voyage', 'logistique'],
        companySize: '1000-5000',
        reviews: [
            {
                id: 1,
                rating: 3,
                title: 'Stabilité',
                text: 'Entreprise solide mais les évolutions sont lentes.',
                author: 'Chauffeur',
                date: '2023-10-05',
                likes: 8,
                dislikes: 2,
                subRatings: { workLifeBalance: 3, management: 3, careerGrowth: 2, culture: 3 }
            }
        ]
    }
];

/**
 * Location & Discovery System Constants
 * Moroccan-optimized categories, cities, quartiers, and amenities
 */

// Main Categories with Icon Suggestions (Enterprise Focus)
export const MAIN_CATEGORIES = [
  { id: 'banque-finance', name: 'Banque & Finance', icon: 'building-library' },
  { id: 'centres-appel-bpo', name: 'Centres d\'Appel & BPO', icon: 'headset' },
  { id: 'distribution-commerce', name: 'Distribution & Commerce', icon: 'shopping-cart' },
  { id: 'industrie-chimie', name: 'Industrie & Chimie', icon: 'factory' },
  { id: 'technologie-it', name: 'Technologie & IT', icon: 'cpu' },
  { id: 'transport-logistique', name: 'Transport & Logistique', icon: 'truck' },
  { id: 'services-professionnels', name: 'Services Professionnels', icon: 'briefcase' },
  { id: 'sante-bien-etre', name: 'Santé & Bien-être', icon: 'stethoscope' },
  { id: 'hotels-hebergement', name: 'Hôtels & Hébergement', icon: 'bed' },
  { id: 'immobilier-construction', name: 'Immobilier & Construction', icon: 'hammer' },
  { id: 'energie-environnement', name: 'Énergie & Environnement', icon: 'zap' },
  { id: 'education-formation', name: 'Éducation & Formation', icon: 'graduation-cap' },
] as const;

// Subcategories based on Moroccan Enterprise sectors
export const SUBCATEGORIES: Record<string, string[]> = {
  'Banque & Finance': [
    'Banque',
    'Assurance',
    'Banque d\'investissement',
    'Fintech & paiement',
    'Services financiers'
  ],
  'Centres d\'Appel & BPO': [
    'BPO & Relation Client',
    'Centres d\'appels',
    'Support Technique',
    'Back Office'
  ],
  'Distribution & Commerce': [
    'Grande Distribution',
    'Supermarchés & Hypermarchés',
    'Commerce de détail',
    'E-commerce',
    'Import-Export'
  ],
  'Industrie & Chimie': [
    'Mine & Phosphates',
    'Agro-industrie',
    'Automobile',
    'Aéronautique',
    'Textile & Habillement',
    'Chimie & Parachimie'
  ],
  'Technologie & IT': [
    'ESN / Consulting IT',
    'Éditeur de logiciels',
    'Cybersécurité',
    'Cloud & Infrastructure',
    'R&D et Innovation',
    'Solutions de paiement'
  ],
  'Transport & Logistique': [
    'Transport Aérien',
    'Logistique & Stockage',
    'Livraison & Messagerie',
    'Transport Routier',
    'Transport Maritime'
  ],
  'Services Professionnels': [
    'Audit & Conseil',
    'Juridique & Fiscalité',
    'Marketing & Communication',
    'RH & Recrutement',
    'Ingénierie'
  ],
  'Santé & Bien-être': [
    'Hôpitaux & Cliniques',
    'Industrie Pharmaceutique',
    'Laboratoires d\'analyses',
    'Centres de soins'
  ],
  'Hôtels & Hébergement': [
    'Hôtellerie de luxe',
    'Chaînes hôtelières',
    'Gestion hôtelière',
    'Tourisme & Voyage'
  ],
  'Immobilier & Construction': [
    'Promotion Immobilière',
    'BTP & Génie Civil',
    'Architecture & Design',
    'Gestion de patrimoine'
  ],
  'Énergie & Environnement': [
    'Énergies Renouvelables',
    'Eau & Assainissement',
    'Pétrole & Gaz',
    'Gestion des déchets'
  ],
  'Éducation & Formation': [
    'Enseignement Supérieur',
    'Écoles d\'Ingénieurs',
    'Centres de Formation',
    'E-learning'
  ]
};

// Moroccan Cities with Popular Quartiers
export const CITIES: Record<string, string[]> = {
  'Casablanca': [
    'Maarif',
    'Anfa',
    'Gauthier',
    'Ain Diab',
    'Bd d\'Anfa',
    'California',
    'Habous',
    'Sidi Maarouf',
    'Derb Sultan',
    'Palmier',
    'Racine',
    'Bourgogne',
    'Hay Hassani',
    'Oulfa'
  ],
  'Rabat': [
    'Agdal',
    'Hay Riad',
    'Souissi',
    'Hassan',
    'Océan',
    'Medina',
    'Yacoub Al Mansour',
    'Aviation',
    'Akkari',
    'Cypern',
    'Diour Jamaa'
  ],
  'Marrakech': [
    'Gueliz',
    'Hivernage',
    'Medina',
    'Palmeraie',
    'Semlalia',
    'Menara',
    'Daoudiate',
    'Majorelle',
    'Targa',
    'Route de Casablanca'
  ],
  'Fès': [
    'Ville Nouvelle',
    'Medina',
    'Rcif',
    'Batha',
    'Champ de Courses',
    'Atlas',
    'Narjiss',
    'Zouagha'
  ],
  'Tanger': [
    'Malabata',
    'Medina',
    'Iberia',
    'California',
    'Boulevard',
    'Charf',
    'Val Fleuri',
    'Jbel Kebir'
  ],
  'Agadir': [
    'Talborjt',
    'Founty',
    'Dakhla',
    'Marina',
    'Haut Founty',
    'Nouveau Talborjt',
    'Suisse',
    'Tikiouine',
    'Charaf'
  ],
  'Meknès': [
    'Ville Nouvelle',
    'Hamria',
    'Medina',
    'Bassatine',
    'Marjane',
    'Riad',
    'Toulal'
  ],
  'Oujda': [
    'Centre Ville',
    'Hay El Qods',
    'Hay Al Fath',
    'Quartier Industriel',
    'Angad',
    'Lazaret'
  ],
  'Kenitra': [
    'Centre Ville',
    'Mimosa',
    'Maamora',
    'Saknia',
    'Ouled Oujih',
    'Bir Rami'
  ],
  'Tétouan': [
    'Centre Ville',
    'Medina',
    'Martil (plage)',
    'Cabo Negro',
    'M\'diq',
    'Ensanche'
  ],
  'Safi': [
    'Plateau',
    'Ville Haute',
    'Colline',
    'Kechla',
    'Medina'
  ],
  'El Jadida': [
    'Centre Ville',
    'Medina',
    'Sidi Bouzid (plage)',
    'Azemmour'
  ]
};

// Amenities grouped by category for UI
export interface AmenityGroup {
  group: string;
  icon?: string;
  amenities: string[];
}

export const BENEFITS: AmenityGroup[] = [
  {
    group: 'Flexibilité',
    icon: '🏠',
    amenities: [
      'Télétravail',
      'Horaires flexibles',
      'Crédit temps'
    ]
  },
  {
    group: 'Santé & Bien-être',
    icon: '🏥',
    amenities: [
      'Mutuelle santé',
      'Salle de sport',
      'Salle de repos',
      'Pause café'
    ]
  },
  {
    group: 'Avantages financiers',
    icon: '💰',
    amenities: [
      'Tickets restaurant',
      'Prime performance',
      'Congés supplémentaires',
      'Bonus annuel'
    ]
  },
  {
    group: 'Développement',
    icon: '📚',
    amenities: [
      'Formation continue',
      'Évolution de carrière',
      'Coaching',
      'Mentorat'
    ]
  },
  {
    group: 'Infrastructures',
    icon: '🏢',
    amenities: [
      'Parking gratuit',
      'Transport en commun',
      'Crèche entreprise',
      'Ascenseur',
      'Accès PMR',
      'Cantine'
    ]
  },
  {
    group: 'Culture & Équipe',
    icon: '🤝',
    amenities: [
      'Team building',
      'Événements internes',
      'Open space',
      'Bureau privé'
    ]
  }
];

// Flatten amenities for easy lookup and filtering
export const ALL_BENEFITS = BENEFITS.flatMap(group => group.amenities);

// Helper function to get amenity group for an amenity
export function getAmenityGroup(amenity: string): AmenityGroup | undefined {
  return BENEFITS.find(group => group.amenities.includes(amenity));
}

// Helper to get subcategories for a category
export function getSubcategoriesForCategory(categoryId: string): string[] {
  return SUBCATEGORIES[categoryId] || [];
}

// Helper to get quartiers for a city
export function getQuartiersForCity(city: string): string[] {
  return CITIES[city] || [];
}

// All cities as array
export const ALL_CITIES = Object.keys(CITIES);

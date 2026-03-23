import type { ImagePlaceholder } from './placeholder-images';
import { z } from 'zod';
import { isValidImageUrl } from './utils';

export type SubscriptionTier = 'standard' | 'growth' | 'gold';

export type DayHours = {
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  open: string;
  close: string;
  isOpen: boolean;
};

// Represents a business update or announcement
export type Update = {
  id: number;
  title: string;
  text: string;
  date: string;
  isPinned?: boolean;
};


// Review for a company
export type Review = {
  id: number;
  rating: number;
  title: string;
  text: string;
  author: string;
  userId?: string; // Added userId for public profile link
  isAnonymous?: boolean;
  date: string;
  subRatings?: {
    workLifeBalance?: number;
    management?: number;
    careerGrowth?: number;
    culture?: number;
    details?: number;
    service?: number;
    quality?: number;
    valueForMoney?: number;
    ambiance?: number;
  };
  likes: number;
  dislikes: number;
  ownerReply?: {
    text: string;
    date: string;
  };
  employmentStatus?: 'current' | 'former' | 'candidate';
  roleSlug?: string;
  departmentSlug?: string;
  citySlug?: string;
  tenureBand?: 'lt_6m' | '6_12m' | '1_2y' | '3_5y' | 'gt_5y';
  contractType?: 'cdi' | 'cdd' | 'intern' | 'freelance' | 'other';
  workMode?: 'onsite' | 'hybrid' | 'remote';
};



// Represents a company
export type Company = {
  id: string; // slug
  name: string;
  logo: ImagePlaceholder;
  photos: ImagePlaceholder[];
  category: string;
  subcategory?: string; // New: specific subcategory
  location: string;
  city?: string; // New: city name
  quartier?: string; // New: neighborhood/quartier
  description: string;
  overallRating: number;
  reviews: Review[];
  type: 'company' | 'commerce' | 'association';
  is_sponsored?: boolean; // New: for top-tier search priority
  isFeatured?: boolean;
  is_premium?: boolean; // Legacy: keep for compatibility during migration
  tier?: SubscriptionTier; // New: tiered model
  tags?: string[];
  logo_url?: string;
  cover_url?: string;
  gallery_urls?: string[];
  phone?: string;
  website?: string;
  address?: string; // Physical address

  // Company-specific
  companySize?: string;
  amenities?: string[]; // Database column name
  benefits?: string[]; // Legacy alias for amenities (deprecated, use amenities)
  hours?: DayHours[];
  updates?: Update[];
  created_at?: string;
  owner_id?: string;
  is_claimed?: boolean;
  whatsapp_number?: string; // New: for premium lead gen
  affiliate_link?: string; // New: for job applications etc
  affiliate_cta?: string; // New: custom label for affiliate link
  admin_affiliate_link?: string; // Admin monetization
  admin_affiliate_cta?: string; // Admin monetization CTA
};

// Alias for backward compatibility
export type Business = Company;


export type CollectionLink =
  | { type: 'filter'; tag?: string; category?: string; city?: string; amenities?: string[] }
  | { type: 'category'; category: string; city?: string }
  | { type: 'city'; city: string }
  | { type: 'custom'; href: string };

export type SeasonalCollection = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageHint: string;
  link: CollectionLink;
};


export const reviewSchema = z.object({
  businessId: z.string(),
  title: z.string().min(5, { message: 'Le titre doit contenir au moins 5 caractères.' }),
  text: z.string().min(10, { message: 'Votre avis doit contenir au moins 10 caractères.' }),
  rating: z.coerce.number().min(1, { message: 'Veuillez donner une note.' }).max(5),
  isAnonymous: z.boolean().optional().default(false),
  employmentStatus: z.enum(['current', 'former', 'candidate']).optional(),
  roleSlug: z.string().trim().max(80).optional(),
  departmentSlug: z.string().trim().max(80).optional(),
  citySlug: z.string().trim().max(80).optional(),
  tenureBand: z.enum(['lt_6m', '6_12m', '1_2y', '3_5y', 'gt_5y']).optional(),
  contractType: z.enum(['cdi', 'cdd', 'intern', 'freelance', 'other']).optional(),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  subRatingWorkLifeBalance: z.coerce.number().min(0).max(5).optional(),
  subRatingManagement: z.coerce.number().min(0).max(5).optional(),
  subRatingCareerGrowth: z.coerce.number().min(0).max(5).optional(),
  subRatingCulture: z.coerce.number().min(0).max(5).optional(),
  // Removed commerce-related ratings
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
  fullName: z.string().min(2, { message: 'Le nom complet doit contenir au moins 2 caractères.' }),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const proSignupSchema = signupSchema.extend({
  jobTitle: z.string().optional(),
  businessName: z.string().min(2, { message: 'Le nom de l\'entreprise doit contenir au moins 2 caractères.' }),
});

export type ProSignupFormData = z.infer<typeof proSignupSchema>;

export const resetPasswordRequestSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
});

export const businessUpdateSchema = z.object({
  title: z.string().min(5, { message: 'Le titre doit contenir au moins 5 caractères.' }),
  text: z.string().min(10, { message: 'La description doit contenir au moins 10 caractères.' }),
});

const isValidImagePath = (value: string) => {
  if (isValidImageUrl(value)) return true;
  if (!value) return false;
  if (/\s/.test(value)) return false;
  if (value.startsWith('data:')) return true;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  return value.includes('/');
};

export const seasonalCollectionSchema = z.object({
  title: z.string().min(2, { message: 'Le titre est requis.' }),
  subtitle: z.string().min(2, { message: 'Le sous-titre est requis.' }),
  imageUrl: z
    .string()
    .min(1, { message: 'URL d\'image invalide.' })
    .refine(isValidImagePath, { message: 'URL d\'image invalide.' }),
  imageHint: z.string().optional(),
  linkType: z.enum(['filter', 'category', 'city', 'custom']),
  linkTag: z.string().optional(),
  linkCategory: z.string().optional(),
  linkCity: z.string().optional(),
  linkAmenities: z.string().optional(),
  linkHref: z.string().optional(),
});

export type SeasonalCollectionFormData = z.infer<typeof seasonalCollectionSchema>;

export const businessHoursSchema = z.array(z.object({
  day_of_week: z.number().min(0).max(6),
  open_time: z.string().nullable(),
  close_time: z.string().nullable(),
  is_closed: z.boolean(),
}));

export const claimSchema = z.object({
  // Step 1: Business Details
  businessName: z.string().trim().min(2, { message: 'Le nom de l\'établissement est requis.' }).max(120, { message: 'Le nom est trop long.' }),
  category: z.string().trim().min(1, { message: 'La catégorie est requise.' }),
  subcategory: z.string().trim().min(1, { message: 'La sous-catégorie est requise.' }),
  address: z.string().trim().min(5, { message: 'L\'adresse est requise.' }).max(250, { message: 'Adresse trop longue.' }),
  city: z.string().trim().min(1, { message: 'La ville est requise.' }),
  quartier: z.string().trim().min(1, { message: 'Le quartier est requis.' }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[0-9+\-\s().]{8,20}$/.test(value), {
      message: 'Numéro de téléphone professionnel invalide.',
    }),
  website: z.string().trim().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
  description: z.string().trim().max(2000, { message: 'Description trop longue.' }).optional(),
  amenities: z.array(z.string()).optional().default([]),

  // Step 2: Identity & Proof
  fullName: z
    .string()
    .trim()
    .min(5, { message: 'Votre nom complet est requis.' })
    .max(120, { message: 'Nom trop long.' })
    .refine((value) => value.split(/\s+/).length >= 2, {
      message: 'Veuillez saisir votre nom et prénom.',
    }),
  position: z.string().trim().min(2, { message: 'Votre poste/fonction est requis.' }).max(80, { message: 'Poste/fonction trop long.' }),
  claimerType: z.enum([
    'owner',
    'co_owner',
    'legal_representative',
    'manager',
    'marketing_manager',
    'agency_representative',
    'employee_delegate',
    'other',
  ]),
  claimerTitle: z.string().trim().max(120, { message: 'Précision trop longue.' }).optional(),
  email: z.string().trim().email({ message: 'Email professionnel invalide.' }),
  personalPhone: z
    .string()
    .trim()
    .refine((value) => /^[0-9+\-\s().]{8,20}$/.test(value), {
      message: 'Téléphone personnel invalide.',
    }),
  proofMethods: z
    .array(z.enum(['email', 'phone', 'document', 'video']))
    .min(1, { message: 'Sélectionnez au moins une méthode de vérification.' })
    .max(4)
    .refine((methods) => new Set(methods).size === methods.length, {
      message: 'Les méthodes de vérification ne doivent pas contenir de doublons.',
    }),
  messageToAdmin: z.string().trim().max(1000, { message: 'Le message est trop long (max 1000 caractères).' }).optional(),

  // Existing Business
  existingBusinessId: z.string().trim().min(2).max(160).optional(),
}).superRefine((data, ctx) => {
  if (data.claimerType === 'other' && !data.claimerTitle) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['claimerTitle'],
      message: 'Veuillez préciser votre rôle.',
    });
  }
});
export type ClaimFormData = z.infer<typeof claimSchema>;

export const salarySubmissionSchema = z.object({
  businessId: z.string().min(1, { message: 'Entreprise invalide.' }),
  jobTitle: z.string().trim().min(2, { message: 'Le poste est requis.' }).max(120, { message: 'Poste trop long.' }),
  salary: z.coerce.number().min(500, { message: 'Salaire trop bas.' }).max(10000000, { message: 'Salaire trop élevé.' }),
  payPeriod: z.enum(['monthly', 'yearly']),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  location: z.string().trim().max(120, { message: 'Localisation trop longue.' }).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  seniorityLevel: z.enum(['junior', 'confirme', 'senior', 'expert', 'manager']).optional(),
  department: z.string().trim().max(120, { message: 'Département trop long.' }).optional(),
  workModel: z.enum(['presentiel', 'hybride', 'teletravail']).optional(),
  bonusFlags: z.object({
    prime: z.boolean().optional(),
    treizieme_mois: z.boolean().optional(),
    commission: z.boolean().optional(),
    bonus_annuel: z.boolean().optional(),
  }).optional(),
  isCurrent: z.boolean(),
});

export type SalarySubmissionData = z.infer<typeof salarySubmissionSchema>;

export type SalaryEntry = {
  id: number;
  business_id: string;
  user_id?: string | null;
  job_title: string;
  salary: number;
  location?: string | null;
  pay_period: 'monthly' | 'yearly';
  currency: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  years_experience?: number | null;
  seniority_level?: 'junior' | 'confirme' | 'senior' | 'expert' | 'manager' | null;
  department?: string | null;
  sector_slug?: string | null;
  work_model?: 'presentiel' | 'hybride' | 'teletravail' | null;
  bonus_flags?: {
    prime: boolean;
    treizieme_mois: boolean;
    commission: boolean;
    bonus_annuel: boolean;
  } | null;
  salary_monthly_normalized?: number | null;
  is_current: boolean;
  source: 'self_reported' | 'legacy' | 'imported';
  status: 'pending' | 'published' | 'rejected';
  moderation_notes?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
};

export type SalaryStats = {
  count: number;
  medianMonthly: number | null;
  minMonthly: number | null;
  maxMonthly: number | null;
  currency: string;
  roleBreakdown: Array<{
    jobTitle: string;
    count: number;
    medianMonthly: number;
  }>;
};

export type SalaryCompanyMetrics = {
  business_id: string;
  business_name: string;
  city: string;
  city_slug: string;
  sector_slug: string;
  submission_count: number;
  avg_monthly_salary: number | null;
  median_monthly_salary: number | null;
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  most_reported_job_title: string | null;
  most_reported_job_title_count: number | null;
  city_avg_salary: number | null;
  sector_avg_salary: number | null;
  pct_above_city_avg: number | null;
  pct_above_sector_avg: number | null;
  refreshed_at: string;
};

export type SalaryCitySectorMetrics = {
  city: string;
  city_slug: string;
  sector_slug: string;
  submission_count: number;
  business_count: number;
  avg_monthly_salary: number | null;
  median_monthly_salary: number | null;
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  junior_median_monthly_salary: number | null;
  senior_median_monthly_salary: number | null;
  refreshed_at: string;
};

export type SalaryCityMetrics = {
  city: string;
  city_slug: string;
  submission_count: number;
  avg_monthly_salary: number | null;
  median_monthly_salary: number | null;
  junior_median_monthly_salary: number | null;
  senior_median_monthly_salary: number | null;
  refreshed_at: string;
};

export type SalaryRoleCityMetrics = {
  job_title: string;
  city: string;
  city_slug: string;
  top_sector_slug: string | null;
  submission_count: number;
  avg_monthly_salary: number | null;
  median_monthly_salary: number | null;
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  junior_median_monthly_salary: number | null;
  senior_median_monthly_salary: number | null;
  national_median_monthly_salary: number | null;
  pct_vs_national_role_median: number | null;
  refreshed_at: string;
};

export type ReferralOfferSummary = {
  id: string;
  business_id?: string | null;
  company_name: string;
  job_title: string;
  city: string | null;
  slots: number;
  created_at: string;
};

export type ReferralDemandSummary = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  summary: string;
  created_at: string;
};

export const jobOfferSourceTypeSchema = z.enum(['manual', 'paste', 'url', 'document']);
export const jobOfferPayPeriodSchema = z.enum(['monthly', 'yearly']);
export const jobOfferContractTypeSchema = z.enum(['cdi', 'cdd', 'freelance', 'internship', 'temporary', 'other']);
export const jobOfferWorkModelSchema = z.enum(['onsite', 'hybrid', 'remote']);
export const jobOfferSenioritySchema = z.enum(['junior', 'mid', 'senior', 'lead', 'manager', 'executive']);

export const jobOfferIngestionSchema = z.object({
  sourceType: z.enum(['paste', 'url']).optional(),
  sourceText: z.string().trim().max(20000, { message: 'Contenu trop long.' }).optional().or(z.literal('')),
  sourceUrl: z.string().trim().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const hasText = Boolean(data.sourceText);
  const hasUrl = Boolean(data.sourceUrl);

  if (!hasText && !hasUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceText'],
      message: 'Collez le texte de l offre ou un lien.',
    });
  }
});

export const jobOfferSubmissionSchema = z.object({
  sourceType: jobOfferSourceTypeSchema.default('manual'),
  sourceUrl: z.string().trim().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
  documentName: z.string().trim().max(200, { message: 'Nom du document trop long.' }).optional().or(z.literal('')),
  companyName: z.string().trim().min(2, { message: 'Entreprise requise.' }).max(160, { message: 'Entreprise trop longue.' }),
  jobTitle: z.string().trim().min(2, { message: 'Poste requis.' }).max(160, { message: 'Poste trop long.' }),
  city: z.string().trim().max(120, { message: 'Ville trop longue.' }).optional().or(z.literal('')),
  salaryMin: z.coerce.number().positive({ message: 'Le salaire minimum doit être supérieur à 0.' }).max(100000000, { message: 'Salaire minimum trop élevé.' }).optional(),
  salaryMax: z.coerce.number().positive({ message: 'Le salaire maximum doit être supérieur à 0.' }).max(100000000, { message: 'Salaire maximum trop élevé.' }).optional(),
  payPeriod: jobOfferPayPeriodSchema.default('monthly'),
  contractType: jobOfferContractTypeSchema.optional(),
  workModel: jobOfferWorkModelSchema.optional(),
  seniorityLevel: jobOfferSenioritySchema.optional(),
  yearsExperienceRequired: z.coerce.number().min(0).max(60).optional(),
  benefits: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
  sourceText: z.string().trim().max(10000, { message: 'Contenu source trop long.' }).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (typeof data.salaryMin === 'number' && typeof data.salaryMax === 'number' && data.salaryMax < data.salaryMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salaryMax'],
      message: 'Le salaire maximum doit être supérieur ou égal au salaire minimum.',
    });
  }

  if (data.sourceType === 'url' && !data.sourceUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceUrl'],
      message: 'URL requise pour une analyse par lien.',
    });
  }

  if (data.sourceType === 'document' && !data.documentName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['documentName'],
      message: 'Nom du document requis pour une analyse PDF.',
    });
  }
});

export type JobOfferSubmissionInput = z.infer<typeof jobOfferSubmissionSchema>;
export type JobOfferIngestionInput = z.infer<typeof jobOfferIngestionSchema>;
export type JobOfferSourceType = z.infer<typeof jobOfferSourceTypeSchema>;
export type JobOfferPayPeriod = z.infer<typeof jobOfferPayPeriodSchema>;
export type JobOfferContractType = z.infer<typeof jobOfferContractTypeSchema>;
export type JobOfferWorkModel = z.infer<typeof jobOfferWorkModelSchema>;
export type JobOfferSeniorityLevel = z.infer<typeof jobOfferSenioritySchema>;
export type JobOfferStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type JobOfferVisibility = 'private' | 'aggregate_only' | 'public';
export type JobOfferRecommendationLabel = 'below_market' | 'fair_market' | 'above_market' | 'strong_offer' | 'insufficient_data';
export type JobOfferConfidenceLevel = 'low' | 'medium' | 'high';
export type JobOfferRiskFlag =
  | 'missing_salary'
  | 'wide_salary_range'
  | 'missing_location'
  | 'missing_contract_type'
  | 'missing_work_model'
  | 'missing_seniority'
  | 'low_benchmark_confidence';

export type JobOfferRecord = {
  id: string;
  user_id?: string | null;
  business_id?: string | null;
  company_name: string;
  job_title: string;
  job_title_normalized?: string | null;
  city?: string | null;
  city_slug?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  pay_period: JobOfferPayPeriod;
  contract_type?: JobOfferContractType | null;
  work_model?: JobOfferWorkModel | null;
  seniority_level?: JobOfferSeniorityLevel | null;
  years_experience_required?: number | null;
  benefits: string[];
  source_text?: string | null;
  source_type: JobOfferSourceType;
  source_url?: string | null;
  document_name?: string | null;
  company_match_confidence?: 'high' | 'medium' | 'low' | 'none';
  company_match_method?: 'slug' | 'id' | 'name' | 'website' | 'scored' | 'manual' | 'none';
  company_match_candidates?: Array<{ businessId: string; score: number; reason: string }>;
  status: JobOfferStatus;
  visibility: JobOfferVisibility;
  submitted_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type JobOfferAnalysisRecord = {
  id: string;
  job_offer_id: string;
  analysis_version: string;
  overall_offer_score: number;
  compensation_score: number;
  market_alignment_score: number;
  transparency_score: number;
  quality_score: number;
  market_position_label: JobOfferRecommendationLabel;
  confidence_level: JobOfferConfidenceLevel;
  benchmark_role_city_median?: number | null;
  benchmark_company_median?: number | null;
  benchmark_city_median?: number | null;
  benchmark_primary_source?: string | null;
  risk_flags: JobOfferRiskFlag[];
  missing_information: string[];
  strengths: string[];
  analysis_summary: string;
  created_at: string;
};

export type AdminJobOfferMappingRow = {
  job_offer_id: string;
  user_id: string | null;
  business_id: string | null;
  company_name: string;
  job_title: string;
  city: string | null;
  source_url: string | null;
  status: JobOfferStatus;
  visibility: JobOfferVisibility;
  company_match_confidence: 'high' | 'medium' | 'low' | 'none';
  company_match_method: 'slug' | 'id' | 'name' | 'website' | 'scored' | 'manual' | 'none';
  company_match_candidates: Array<{ businessId: string; score: number; reason: string }>;
  submitted_at: string;
  overall_offer_score?: number | null;
  transparency_score?: number | null;
  market_position_label?: JobOfferRecommendationLabel | null;
  confidence_level?: JobOfferConfidenceLevel | null;
};

export type JobOfferCompanyMetrics = {
  business_id: string;
  business_name: string;
  city_slug: string | null;
  approved_offer_count: number;
  median_offer_monthly: number | null;
  avg_offer_monthly: number | null;
  avg_offer_score: number | null;
  transparency_score_avg: number | null;
  refreshed_at: string;
};

export type JobOfferBusinessInsights = {
  business_id: string;
  approved_offer_count: number;
  salary_disclosure_rate: number | null;
  avg_transparency_score: number | null;
  avg_overall_offer_score: number | null;
  avg_benchmark_confidence_score: number | null;
  below_market_rate: number | null;
  above_market_rate: number | null;
  missing_salary_rate: number | null;
  onsite_rate: number | null;
  hybrid_rate: number | null;
  remote_rate: number | null;
  cdi_rate: number | null;
  dominant_work_model?: JobOfferWorkModel | null;
  dominant_contract_type?: JobOfferContractType | null;
  top_hiring_roles?: Array<{
    role_key: string;
    role_label: string;
    offer_count: number;
  }> | null;
  last_offer_at?: string | null;
};

export type JobOfferBusinessMonthlyTrend = {
  business_id: string;
  month_date: string;
  month_key: string;
  approved_offer_count: number;
  salary_disclosure_rate: number | null;
  avg_transparency_score: number | null;
  avg_overall_offer_score: number | null;
};

export type JobOfferRoleCityMetrics = {
  job_title_normalized: string;
  city_slug: string;
  approved_offer_count: number;
  median_offer_monthly: number | null;
  avg_offer_monthly: number | null;
  avg_offer_score: number | null;
  refreshed_at: string;
};

export type JobOfferExtractionResult = {
  companyName: string;
  jobTitle: string;
  city?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  payPeriod: JobOfferPayPeriod;
  contractType?: JobOfferContractType | null;
  workModel?: JobOfferWorkModel | null;
  seniorityLevel?: JobOfferSeniorityLevel | null;
  yearsExperienceRequired?: number | null;
  benefits: string[];
  sourceSummary: string;
};

export type JobOfferExtractionStage =
  | 'resolve_source'
  | 'clean_source'
  | 'extract_heuristic'
  | 'extract_ai'
  | 'merge_fields'
  | 'validate_fields';

export type JobOfferExtractionFieldName =
  | 'companyName'
  | 'jobTitle'
  | 'city'
  | 'salaryMin'
  | 'salaryMax'
  | 'payPeriod'
  | 'contractType'
  | 'workModel'
  | 'seniorityLevel'
  | 'yearsExperienceRequired'
  | 'benefits';

export type JobOfferExtractionConfidence = 'none' | 'low' | 'medium' | 'high';

export type JobOfferExtractionFieldDiagnostic = {
  value: string | number | string[] | null;
  confidence: JobOfferExtractionConfidence;
  source: 'heuristic' | 'ai' | 'merged' | 'default' | 'none';
  evidence?: string | null;
};

export type JobOfferExtractionDiagnostics = {
  sourceType: 'paste' | 'url';
  currentStage: JobOfferExtractionStage;
  sourceUrl?: string | null;
  sourceFetchStatus: 'not_applicable' | 'fetched' | 'failed';
  sourceFetchError?: string | null;
  rawContentLength: number;
  cleanedContentLength: number;
  rawContentPreview: string;
  cleanedContentPreview: string;
  usedAi: boolean;
  notes: string[];
  missingCriticalFields: Array<'companyName' | 'jobTitle'>;
  minimumFieldsMet: boolean;
  fieldDiagnostics: Partial<Record<JobOfferExtractionFieldName, JobOfferExtractionFieldDiagnostic>>;
};

export type JobOfferExtractionPipelineResult = {
  extracted: JobOfferExtractionResult & {
    rawContent: string;
    cleanedContent: string;
  };
  diagnostics: JobOfferExtractionDiagnostics;
};

export const businessProfileUpdateSchema = z.object({
  name: z.string().min(2, { message: 'Le nom de l\'établissement est requis.' }),
  description: z.string().optional(),
  category: z.string().min(1, { message: 'La catégorie est requise.' }),
  subcategory: z.string().optional(),
  city: z.string().min(1, { message: 'La ville est requise.' }),
  quartier: z.string().optional(),
  location: z.string().min(5, { message: 'L\'adresse est requise.' }),
  website: z.string().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
  amenities: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  whatsapp_number: z.string().optional(),
  affiliate_link: z.string().url({ message: 'URL d\'affiliation invalide.' }).optional().or(z.literal('')),
  affiliate_cta: z.string().optional(),
});

export const mediaReportSchema = z.object({
  media_url: z.string().url(),
  media_type: z.enum(['image', 'video', 'document']).default('image'),
  business_id: z.string(),
  reason: z.enum(['inappropriate', 'copyright', 'misleading', 'spam', 'other']),
  details: z.string().max(500).optional(),
});

export const reviewReportSchema = z.object({
  review_id: z.number(),
  business_id: z.string(),
  reason: z.enum([
    'spam_or_promotional',
    'fake_or_coordinated',
    'personal_data_or_doxxing',
    'harassment_or_hate',
    'defamation_unverified_accusation',
    'conflict_of_interest',
    'off_topic',
    'copyright_or_copied_content',
    'other',
  ]),
  details: z.string().max(500).optional(),
});

export const reviewAppealSchema = z.object({
  review_id: z.number(),
  message: z.string().trim().min(10).max(2000),
});

export const businessReportSchema = z.object({
  business_id: z.string(),
  reason: z.enum(['closed', 'duplicate', 'incorrect_info', 'offensive', 'scam', 'other']),
  details: z.string().max(1000).optional(),
});

export type BusinessReportFormData = z.infer<typeof businessReportSchema>;
export type MediaReportFormData = z.infer<typeof mediaReportSchema>;
export type ReviewReportFormData = z.infer<typeof reviewReportSchema>;
export type ReviewAppealFormData = z.infer<typeof reviewAppealSchema>;

export type BusinessProfileUpdateData = z.infer<typeof businessProfileUpdateSchema>;

export const userProfileUpdateSchema = z.object({
  full_name: z.string().min(2, { message: 'Le nom complet doit contenir au moins 2 caractères.' }),
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  email_preferences: z.object({
    marketing: z.boolean(),
    system: z.boolean(),
    review_replies: z.boolean(),
    claim_updates: z.boolean(),
  }).optional(),
});

export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>;

export type ActionState<T = any> = {
  status: 'idle' | 'success' | 'error';
  message: string;
  errors?: {
    [key in keyof T]?: string[];
  };
  data?: any;
  details?: Record<string, unknown>;
};

export type ReviewFormState = ActionState<ReviewFormData>;
export type AuthFormState = ActionState;


// Profile type for user profiles
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: 'user' | 'pro' | 'admin';
  admin_access_level?: 'super_admin' | 'admin_ops' | 'moderator' | 'analyst' | 'support' | null;
  admin_permissions?: string[] | null;
  is_premium: boolean; // Legacy
  tier: SubscriptionTier; // New
  premium_expires_at?: string;
  business_id?: string;
  created_at: string;
  updated_at?: string;
};

// Ad type for advertising system
export type Ad = {
  id: string;
  advertiser_id: string;
  title: string;
  content: string;
  target_business_ids?: string[];
  targeting_criteria?: Record<string, any>;
  budget_cents: number;
  spent_cents: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
};

// Support ticket type
export type SupportTicket = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  business_id?: string;
  business_name?: string;
  subject: string;
  message: string;
  category: 'account' | 'billing' | 'business' | 'reviews' | 'technical' | 'other';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_response?: string;
  admin_user_id?: string;
  is_read_by_user: boolean;
  is_read_by_admin: boolean;
  created_at: string;
  updated_at: string;
};

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: 'user' | 'admin';
  message: string;
  created_at: string;
}

// Competitor ad type
export type CompetitorAd = {
  id: string;
  advertiser_business_id: string;
  target_competitor_ids?: string[];
  title: string;
  content: string;
  media_urls?: string[];
  budget_cents: number;
  spent_cents: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
};

export type CompetitorAdEventType = 'impression' | 'click';

export type CompetitorAdEvent = {
  id: number;
  ad_id: string;
  advertiser_business_id: string;
  target_business_id: string;
  event_type: CompetitorAdEventType;
  viewer_session_id?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

// Type for paginated businesses
export type PaginatedBusinesses = {
  businesses: Business[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};


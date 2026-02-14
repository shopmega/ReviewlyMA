import type { ImagePlaceholder } from './placeholder-images';
import { z } from 'zod';
import { isValidImageUrl } from './utils';

export type SubscriptionTier = 'none' | 'growth' | 'gold';

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
  businessName: z.string().min(2, { message: 'Le nom de l\'établissement est requis.' }),
  category: z.string().min(1, { message: 'La catégorie est requise.' }),
  subcategory: z.string().min(1, { message: 'La sous-catégorie est requise.' }),
  address: z.string().min(5, { message: 'L\'adresse est requise.' }),
  city: z.string().min(1, { message: 'La ville est requise.' }),
  quartier: z.string().min(1, { message: 'Le quartier est requis.' }),
  phone: z.string().optional(),
  website: z.string().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional().default([]),

  // Step 2: Identity & Proof
  fullName: z.string().min(2, { message: 'Votre nom complet est requis.' }),
  position: z.string().min(2, { message: 'Votre poste/fonction est requis.' }),
  email: z.string().email({ message: 'Email professionnel invalide.' }),
  personalPhone: z.string().min(8, { message: 'Téléphone personnel invalide.' }),
  proofMethods: z.array(z.string()).min(1, { message: 'Sélectionnez au moins une méthode de vérification.' }),
  messageToAdmin: z.string().optional(),

  // Existing Business
  existingBusinessId: z.string().optional(),
});

export type ClaimFormData = z.infer<typeof claimSchema>;

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
  reason: z.enum(['spam', 'fake', 'offensive', 'irrelevant', 'other']),
  details: z.string().max(500).optional(),
});

export const businessReportSchema = z.object({
  business_id: z.string(),
  reason: z.enum(['closed', 'duplicate', 'incorrect_info', 'offensive', 'scam', 'other']),
  details: z.string().max(1000).optional(),
});

export type BusinessReportFormData = z.infer<typeof businessReportSchema>;
export type MediaReportFormData = z.infer<typeof mediaReportSchema>;
export type ReviewReportFormData = z.infer<typeof reviewReportSchema>;

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

// Pinned content type
export type PinnedContent = {
  id: string;
  business_id: string;
  title: string;
  content: string;
  media_urls?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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

// Type for paginated businesses
export type PaginatedBusinesses = {
  businesses: Business[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

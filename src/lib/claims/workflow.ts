import { getMaxBusinessesForTier } from '@/lib/tier-utils';
import type { SubscriptionTier } from '@/lib/types';

type ClaimData = {
  existingBusinessId?: string;
  fullName: string;
  email: string;
  businessName: string;
  category: string;
  subcategory: string;
  address: string;
  city: string;
  quartier: string;
  description?: string;
  website?: string;
  phone?: string;
  amenities: string[];
};

type UserProfileRecord = {
  business_id: string | null;
  role: string | null;
  tier: string | null;
  full_name: string | null;
  email: string | null;
  is_premium?: boolean | null;
};

type ClaimRecord = {
  id?: string;
  status?: string | null;
  claim_state?: string | null;
  business_id: string;
};

export async function getClaimUserContext(input: {
  supabaseService: any;
  userId: string;
}) {
  const { supabaseService, userId } = input;

  const { data: currentUserProfile } = await supabaseService
    .from('profiles')
    .select('business_id, role, tier, full_name, email, is_premium')
    .eq('id', userId)
    .single();

  const { data: existingClaims } = await supabaseService
    .from('business_claims')
    .select('id, status, claim_state, business_id')
    .eq('user_id', userId);

  return {
    currentUserProfile: currentUserProfile as UserProfileRecord | null,
    existingClaims: (existingClaims || []) as ClaimRecord[],
    isAdmin: currentUserProfile?.role === 'admin',
  };
}

export async function getClaimEligibilityError(input: {
  supabaseService: any;
  userId: string;
  currentUserProfile: UserProfileRecord | null;
  existingClaims: ClaimRecord[];
  isAdmin: boolean;
}) {
  const { supabaseService, userId, currentUserProfile, existingClaims, isAdmin } = input;

  if (!isAdmin) {
    const managedBusinessIds = new Set<string>();

    if (currentUserProfile?.business_id) {
      managedBusinessIds.add(currentUserProfile.business_id);
    }

    existingClaims
      .filter((claim) => claim.status === 'approved' || claim.claim_state === 'verified')
      .forEach((claim) => managedBusinessIds.add(claim.business_id));

    const { data: assignments } = await supabaseService
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId);

    assignments?.forEach((assignment: { business_id: string }) => managedBusinessIds.add(assignment.business_id));

    const maxAllowed = getMaxBusinessesForTier((currentUserProfile?.tier as SubscriptionTier) || 'standard');
    if (managedBusinessIds.size >= maxAllowed) {
      return `Vous gérez déjà le nombre maximum d'établissements autorisé pour votre offre (${maxAllowed}).`;
    }
  }

  const hasPending = existingClaims.some(
    (claim) => claim.status === 'pending' || claim.claim_state === 'verification_pending',
  );

  if (hasPending) {
    return 'Vous avez déjà une demande de revendication en cours. Veuillez attendre sa validation avant d\'en soumettre une autre.';
  }

  return null;
}

export async function syncClaimUserProfile(input: {
  supabaseService: any;
  userId: string;
  currentUserProfile: UserProfileRecord | null;
  claimData: Pick<ClaimData, 'fullName' | 'email'>;
}) {
  const { supabaseService, userId, currentUserProfile, claimData } = input;

  const profileUpdates: Record<string, unknown> = {
    id: userId,
    role: currentUserProfile?.role || 'user',
    business_id: currentUserProfile?.business_id || null,
  };

  if (!currentUserProfile?.full_name) {
    profileUpdates.full_name = claimData.fullName;
  }
  if (!currentUserProfile?.email) {
    profileUpdates.email = claimData.email;
  }

  return supabaseService
    .from('profiles')
    .upsert(profileUpdates, { onConflict: 'id' });
}

export async function resolveClaimBusiness(input: {
  supabaseService: any;
  claimData: ClaimData;
  requestedBusinessUpdates: Record<string, unknown>;
  isAdmin: boolean;
  isBusinessClaimed: (businessId: string) => Promise<boolean>;
}) {
  const { supabaseService, claimData, requestedBusinessUpdates, isAdmin, isBusinessClaimed } = input;

  if (claimData.existingBusinessId) {
    const alreadyClaimed = await isBusinessClaimed(claimData.existingBusinessId);
    if (alreadyClaimed) {
      return { error: 'Cet établissement a déjà été revendiqué par un autre utilisateur.' } as const;
    }

    const businessId = claimData.existingBusinessId;

    if (isAdmin && Object.keys(requestedBusinessUpdates).length > 0) {
      const { error } = await supabaseService
        .from('businesses')
        .update(requestedBusinessUpdates)
        .eq('id', businessId);

      if (error) {
        return { updateError: error, businessId } as const;
      }
    }

    return { businessId } as const;
  }

  const businessPayload = {
    id: `${claimData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    name: claimData.businessName,
    type: 'commerce',
    category: claimData.category,
    subcategory: claimData.subcategory,
    city: claimData.city,
    quartier: claimData.quartier,
    location: `${claimData.address}, ${claimData.quartier}, ${claimData.city}`,
    description: claimData.description || 'A completer',
    website: claimData.website || null,
    amenities: claimData.amenities,
    overall_rating: 0,
    is_featured: false,
    logo_url: null,
    logo_hint: null,
    cover_url: null,
    cover_hint: null,
    tags: [],
  };

  const { data: businessData, error } = await supabaseService
    .from('businesses')
    .insert([businessPayload])
    .select('id')
    .single();

  if (error) {
    return { createError: error } as const;
  }

  if (!businessData?.id) {
    return { missingId: true } as const;
  }

  return { businessId: businessData.id } as const;
}

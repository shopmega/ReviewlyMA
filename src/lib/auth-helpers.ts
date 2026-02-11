/**
 * Centralized Authorization Helpers
 * TIER 3 FEATURE: Reusable auth functions throughout the app
 * 
 * Eliminates scattered auth logic and provides consistent authorization
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Authorization result type
 */
export interface AuthCheckResult {
  isAuthorized: boolean;
  userId?: string;
  role?: string;
  businessId?: string;
  reason?: string;
}

/**
 * Get authenticated user with their profile info
 */
export async function getCurrentUserWithProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, business_id, is_premium')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile,
  };
}

/**
 * Verify user is authenticated
 */
export async function requireAuth(): Promise<AuthCheckResult> {
  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
    role: userWithProfile.profile?.role,
    businessId: userWithProfile.profile?.business_id,
  };
}

/**
 * Verify user is admin
 */
export async function requireAdmin(): Promise<AuthCheckResult> {
  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (userWithProfile.profile?.role !== 'admin') {
    return {
      isAuthorized: false,
      reason: 'User is not an admin',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
    role: 'admin',
  };
}

/**
 * Verify user is pro (business owner)
 */
export async function requirePro(): Promise<AuthCheckResult> {
  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (userWithProfile.profile?.role !== 'pro') {
    return {
      isAuthorized: false,
      reason: 'User is not a pro member',
    };
  }

  if (!userWithProfile.profile?.business_id) {
    return {
      isAuthorized: false,
      reason: 'User has no associated business',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
    role: 'pro',
    businessId: userWithProfile.profile.business_id,
  };
}

/**
 * Verify user is premium
 */
export async function requirePremium(): Promise<AuthCheckResult> {
  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (!userWithProfile.profile?.is_premium) {
    return {
      isAuthorized: false,
      reason: 'User does not have premium access',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
    role: userWithProfile.profile.role,
  };
}

/**
 * Verify user owns the business (for editing business data)
 */
export async function requireBusinessOwner(
  businessId: string
): Promise<AuthCheckResult> {
  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (userWithProfile.profile?.business_id !== businessId) {
    return {
      isAuthorized: false,
      reason: 'User does not own this business',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
    businessId,
  };
}

/**
 * Verify user can edit the claim (owner or admin)
 */
export async function requireClaimAccess(
  claimId: string
): Promise<AuthCheckResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const userWithProfile = await getCurrentUserWithProfile();

  if (!userWithProfile) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  // Admins can access any claim
  if (userWithProfile.profile?.role === 'admin') {
    return {
      isAuthorized: true,
      userId: userWithProfile.user.id,
      role: 'admin',
    };
  }

  // Check if user is the claim owner
  const { data: claim } = await supabase
    .from('business_claims')
    .select('user_id')
    .eq('id', claimId)
    .single();

  if (!claim) {
    return {
      isAuthorized: false,
      reason: 'Claim not found',
    };
  }

  if (claim.user_id !== userWithProfile.user.id) {
    return {
      isAuthorized: false,
      reason: 'User does not have access to this claim',
    };
  }

  return {
    isAuthorized: true,
    userId: userWithProfile.user.id,
  };
}

/**
 * Helper to return error from auth check result
 */
export function getAuthErrorMessage(result: AuthCheckResult): string {
  if (result.isAuthorized) {
    return '';
  }

  const messages: Record<string, string> = {
    'User not authenticated': 'Vous devez être connecté.',
    'User is not an admin': 'Vous n\'avez pas les permissions d\'administrateur.',
    'User is not a pro member': 'Cette fonctionnalité est réservée aux membres pro.',
    'User has no associated business': 'Aucun établissement n\'est associé à votre compte.',
    'User does not have premium access': 'Cette fonctionnalité nécessite un accès premium.',
    'User does not own this business': 'Vous n\'êtes pas autorisé à modifier cet établissement.',
    'Claim not found': 'Cette revendication n\'a pas été trouvée.',
    'User does not have access to this claim': 'Vous n\'avez pas accès à cette revendication.',
  };

  return messages[result.reason || ''] || 'Accès refusé.';
}

/**
 * Export all auth functions as a namespace for easier usage
 */
export const auth = {
  getCurrentUserWithProfile,
  requireAuth,
  requireAdmin,
  requirePro,
  requirePremium,
  requireBusinessOwner,
  requireClaimAccess,
  getAuthErrorMessage,
};

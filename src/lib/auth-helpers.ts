/**
 * Centralized server-side authorization helpers.
 * Keep this layer thin: authenticated Supabase client + explicit access checks.
 */

import { createClient } from '@/lib/supabase/server';

export interface AuthCheckResult {
  isAuthorized: boolean;
  userId?: string;
  role?: string;
  businessId?: string;
  reason?: string;
}

export async function getCurrentAuthUser() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return user;
    }
  } catch {
    // Fall through to session lookup.
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (!error && session?.user) {
      return session.user;
    }
  } catch {
    // Leave unauthenticated.
  }

  return null;
}

export async function getCurrentUserWithProfile() {
  const supabase = await createClient();
  const user = await getCurrentAuthUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, tier, is_premium, business_id, created_at, updated_at')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile,
  };
}

export async function requireAuth(): Promise<AuthCheckResult> {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
    role: currentUser.profile?.role,
    businessId: currentUser.profile?.business_id,
  };
}

export async function requireAdmin(): Promise<AuthCheckResult> {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (currentUser.profile?.role !== 'admin') {
    return {
      isAuthorized: false,
      reason: 'User is not an admin',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
    role: 'admin',
  };
}

export async function requirePro(): Promise<AuthCheckResult> {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (currentUser.profile?.role !== 'pro') {
    return {
      isAuthorized: false,
      reason: 'User is not a pro member',
    };
  }

  if (!currentUser.profile?.business_id) {
    return {
      isAuthorized: false,
      reason: 'User has no associated business',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
    role: 'pro',
    businessId: currentUser.profile.business_id,
  };
}

export async function requirePremium(): Promise<AuthCheckResult> {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  const hasPremium = Boolean(currentUser.profile?.is_premium) || currentUser.profile?.tier === 'growth' || currentUser.profile?.tier === 'gold';
  if (!hasPremium) {
    return {
      isAuthorized: false,
      reason: 'User does not have premium access',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
    role: currentUser.profile?.role,
    businessId: currentUser.profile?.business_id,
  };
}

export async function requireBusinessOwner(businessId: string): Promise<AuthCheckResult> {
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (currentUser.profile?.business_id !== businessId) {
    return {
      isAuthorized: false,
      reason: 'User does not own this business',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
    businessId,
  };
}

export async function requireClaimAccess(claimId: string): Promise<AuthCheckResult> {
  const supabase = await createClient();
  const currentUser = await getCurrentUserWithProfile();

  if (!currentUser) {
    return {
      isAuthorized: false,
      reason: 'User not authenticated',
    };
  }

  if (currentUser.profile?.role === 'admin') {
    return {
      isAuthorized: true,
      userId: currentUser.user.id,
      role: 'admin',
    };
  }

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

  if (claim.user_id !== currentUser.user.id) {
    return {
      isAuthorized: false,
      reason: 'User does not have access to this claim',
    };
  }

  return {
    isAuthorized: true,
    userId: currentUser.user.id,
  };
}

export function getAuthErrorMessage(result: AuthCheckResult): string {
  if (result.isAuthorized) {
    return '';
  }

  const messages: Record<string, string> = {
    'User not authenticated': 'Vous devez etre connecte.',
    'User is not an admin': "Vous n'avez pas les permissions d'administrateur.",
    'User is not a pro member': 'Cette fonctionnalite est reservee aux membres pro.',
    'User has no associated business': "Aucun etablissement n'est associe a votre compte.",
    'User does not have premium access': 'Cette fonctionnalite necessite un acces premium.',
    'User does not own this business': "Vous n'etes pas autorise a modifier cet etablissement.",
    'Claim not found': "Cette revendication n'a pas ete trouvee.",
    'User does not have access to this claim': "Vous n'avez pas acces a cette revendication.",
  };

  return messages[result.reason || ''] || 'Acces refuse.';
}

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

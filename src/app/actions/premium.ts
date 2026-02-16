'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ActionState, SubscriptionTier } from '@/lib/types';
import { logger } from '@/lib/logger';
import { getMaxBusinessesForTier, isPaidTier } from '@/lib/tier-utils';

export async function getUserPremiumStatus(userId: string): Promise<{
  isPremium: boolean;
  maxBusinesses: number;
  subscriptionTier: SubscriptionTier;
  expiresAt?: string;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  try {
    // Check premium_users table first (legacy system)
    const { data: premiumUser } = await supabase
      .from('premium_users')
      .select('max_businesses, subscription_tier, subscription_expires_at')
      .eq('user_id', userId)
      .eq('subscription_status', 'active')
      .maybeSingle();

    if (premiumUser) {
      const tier = premiumUser.subscription_tier as SubscriptionTier;
      const tierLimit = getMaxBusinessesForTier(tier);
      const maxBusinesses = Math.min(premiumUser.max_businesses ?? tierLimit, tierLimit);

      // Check if the subscription has expired
      if (premiumUser.subscription_expires_at && new Date(premiumUser.subscription_expires_at) < new Date()) {
        return {
          isPremium: false,
          maxBusinesses: 1,
          subscriptionTier: 'standard',
          expiresAt: premiumUser.subscription_expires_at
        };
      }

      return {
        isPremium: isPaidTier(tier),
        maxBusinesses,
        subscriptionTier: tier,
        expiresAt: premiumUser.subscription_expires_at
      };
    }

    // Primary: Check profiles table for tier (Modern System)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, tier, premium_expires_at')
      .eq('id', userId)
      .single();

    if (profile?.tier && isPaidTier(profile.tier)) {
      // Use tier as primary source of truth
      const tier = profile.tier as SubscriptionTier;
      const maxBusinesses = getMaxBusinessesForTier(tier);

      // Check if the premium subscription has expired
      if (profile.premium_expires_at && new Date(profile.premium_expires_at) < new Date()) {
        return {
          isPremium: false,
          maxBusinesses: 1,
          subscriptionTier: 'standard',
          expiresAt: profile.premium_expires_at
        };
      }

      return {
        isPremium: true,
        maxBusinesses,
        subscriptionTier: tier,
        expiresAt: profile.premium_expires_at
      };
    }

    // Fallback: Check legacy is_premium flag
    if (profile?.is_premium) {
      // For legacy users with is_premium but no tier, assume 'gold'
      // Also check if premium has expired
      if (profile.premium_expires_at && new Date(profile.premium_expires_at) < new Date()) {
        return {
          isPremium: false,
          maxBusinesses: 1,
          subscriptionTier: 'standard',
          expiresAt: profile.premium_expires_at
        };
      }
      return {
        isPremium: true,
        maxBusinesses: 1, // Pro/Growth are limited to one business
        subscriptionTier: 'gold',
        expiresAt: profile.premium_expires_at
      };
    }

    // Fallback to basic user
    return {
      isPremium: false,
      maxBusinesses: 1,
      subscriptionTier: 'standard'
    };
  } catch (error) {
    logger.error('Error checking premium status', error);
    return {
      isPremium: false,
      maxBusinesses: 1,
      subscriptionTier: 'standard'
    };
  }
}

export async function getUserBusinesses(userId: string): Promise<{
  businesses: Array<{
    id: string;
    name: string;
    role: string;
    isPrimary: boolean;
    overallRating: number;
    reviewCount: number;
  }>;
  canAddMore: boolean;
  currentCount: number;
  maxAllowed: number;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  try {
    // Get premium status first
    const premiumStatus = await getUserPremiumStatus(userId);

    // Check if user_businesses table exists and has data
    const { data: userBusinesses, error } = await supabase
      .from('user_businesses')
      .select(`
        business_id,
        role,
        is_primary,
        businesses!inner(
          name,
          overall_rating,
          reviews(count)
        )
      `)
      .eq('user_id', userId);

    if (error || !userBusinesses || userBusinesses.length === 0) {
      // Fallback to old system (profiles.business_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (profile?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('id, name, overall_rating, reviews(count)')
          .eq('id', profile.business_id)
          .single();

        if (business) {
          return {
            businesses: [{
              id: business.id,
              name: business.name,
              role: 'owner',
              isPrimary: true,
              overallRating: business.overall_rating || 0,
              reviewCount: (business.reviews as any)?.[0]?.count || 0
            }],
            canAddMore: premiumStatus.maxBusinesses > 1,
            currentCount: 1,
            maxAllowed: premiumStatus.maxBusinesses
          };
        }
      }

      return {
        businesses: [],
        canAddMore: premiumStatus.maxBusinesses > 0,
        currentCount: 0,
        maxAllowed: premiumStatus.maxBusinesses
      };
    }

    const businesses = userBusinesses.map(ub => ({
      id: ub.business_id,
      name: (ub.businesses as any).name,
      role: ub.role,
      isPrimary: ub.is_primary,
      overallRating: (ub.businesses as any).overall_rating || 0,
      reviewCount: (ub.businesses as any).reviews?.[0]?.count || 0
    }));

    return {
      businesses,
      canAddMore: businesses.length < premiumStatus.maxBusinesses,
      currentCount: businesses.length,
      maxAllowed: premiumStatus.maxBusinesses
    };
  } catch (error) {
    logger.error('Error getting user businesses', error);
    return {
      businesses: [],
      canAddMore: false,
      currentCount: 0,
      maxAllowed: 1
    };
  }
}

export async function addBusinessToUser(
  userId: string,
  businessId: string,
  role: string = 'owner'
): Promise<ActionState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  try {
    // Check premium status and limits
    const { businesses, canAddMore } = await getUserBusinesses(userId);

    if (!canAddMore) {
      return {
        status: 'error',
        message: 'Business limit reached. Each account can manage only one business.'
      };
    }

    // Check if business already exists
    if (businesses.some(b => b.id === businessId)) {
      return {
        status: 'error',
        message: 'You already manage this business.'
      };
    }

    // Add business to user_businesses
    const { error } = await supabase
      .from('user_businesses')
      .insert({
        user_id: userId,
        business_id: businessId,
        role,
        is_primary: businesses.length === 0 // First business is primary
      });

    if (error) {
      return {
        status: 'error',
        message: `Error adding business: ${error.message}`
      };
    }

    // Update profiles table for backward compatibility
    if (businesses.length === 0) {
      await supabase
        .from('profiles')
        .update({
          business_id: businessId,
          role: 'pro'
        })
        .eq('id', userId);
    }

    return {
      status: 'success',
      message: 'Business added successfully!'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Failed to add business'
    };
  }
}

export async function setPrimaryBusiness(userId: string, businessId: string): Promise<ActionState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  try {
    // Check if user owns this business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('id')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .single();

    if (!userBusiness) {
      return {
        status: 'error',
        message: 'You do not manage this business.'
      };
    }

    // Remove primary flag from all businesses
    await supabase
      .from('user_businesses')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set new primary business
    const { error } = await supabase
      .from('user_businesses')
      .update({ is_primary: true })
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (error) {
      return {
        status: 'error',
        message: `Error setting primary business: ${error.message}`
      };
    }

    // Update profiles table for backward compatibility
    await supabase
      .from('profiles')
      .update({ business_id: businessId })
      .eq('id', userId);

    return {
      status: 'success',
      message: 'Primary business updated!'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Failed to set primary business'
    };
  }
}

export async function removeBusinessFromUser(
  userId: string,
  businessId: string
): Promise<ActionState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );

  try {
    // Check if it's the primary business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('is_primary')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .single();

    if (!userBusiness) {
      return {
        status: 'error',
        message: 'You do not manage this business.'
      };
    }

    if (userBusiness.is_primary) {
      return {
        status: 'error',
        message: 'Cannot remove primary business. Set another business as primary first.'
      };
    }

    // Remove business
    const { error } = await supabase
      .from('user_businesses')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (error) {
      return {
        status: 'error',
        message: `Error removing business: ${error.message}`
      };
    }

    return {
      status: 'success',
      message: 'Business removed successfully!'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Failed to remove business'
    };
  }
}

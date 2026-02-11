import { SubscriptionTier } from '@/lib/types';

/**
 * Check if a user's tier has access to a required tier level
 * @param requiredTier The minimum tier required for access
 * @param userTier The user's current tier
 * @returns Boolean indicating if access should be granted
 */
export function hasTierAccess(
  requiredTier: SubscriptionTier,
  userTier: SubscriptionTier
): boolean {
  if (requiredTier === 'none') return true; // Everyone gets basic access
  // Legacy compatibility: treat "pro" as equivalent to "gold"
  if (requiredTier === 'growth') return userTier === 'growth' || userTier === 'gold' || userTier === 'pro';
  if (requiredTier === 'gold') return userTier === 'gold' || userTier === 'pro';
  return false;
}

/**
 * Get the maximum number of businesses a user can manage based on their tier
 * @param tier The user's subscription tier
 * @returns The maximum number of businesses allowed
 */
export function getMaxBusinessesForTier(tier: SubscriptionTier): number {
  switch (tier) {
    case 'growth':
      return 1;
    case 'gold':
    case 'pro':
      return 1;
    case 'none':
    default:
      return 1;
  }
}

/**
 * Get the price for a given tier and billing cycle
 * @param tier The subscription tier
 * @param cycle Monthly or yearly billing cycle
 * @param siteSettings Site settings containing pricing information
 * @returns Price in MAD
 */
export function getTierPrice(tier: SubscriptionTier, cycle: 'monthly' | 'yearly', siteSettings?: any): number {
  if (tier === 'growth') {
    return cycle === 'yearly'
      ? (siteSettings?.tier_growth_annual_price || 990)
      : (siteSettings?.tier_growth_monthly_price || 99);
  }

  if (tier === 'gold' || tier === 'pro') {
    return cycle === 'yearly'
      ? (siteSettings?.tier_gold_annual_price || 2900)
      : (siteSettings?.tier_gold_monthly_price || 299);
  }

  return 0; // Free tier
}

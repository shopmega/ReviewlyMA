import { SubscriptionTier } from '@/lib/types';

const TIER_RANK: Record<SubscriptionTier, number> = {
  standard: 0,
  growth: 1,
  gold: 2,
};

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
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * Check if a tier is a paid/premium tier (Growth or Gold)
 * This is used to gate functional Pro features like Tags, WhatsApp, etc.
 * @param tier The user's current tier (can be undefined)
 * @returns Boolean indicating if the tier is paid
 */
export function isPaidTier(tier: SubscriptionTier | undefined | null): boolean {
  if (!tier) return false;
  return tier === 'growth' || tier === 'gold';
}

/**
 * Resolve the effective tier between a profile tier and a managed business tier.
 * The highest tier wins so Gold business access is honored even if the profile tier is lower.
 */
export function getEffectiveTier(
  profileTier: SubscriptionTier | undefined | null,
  businessTier: SubscriptionTier | undefined | null
): SubscriptionTier {
  const normalizedProfileTier = profileTier ?? 'standard';
  const normalizedBusinessTier = businessTier ?? 'standard';
  return TIER_RANK[normalizedBusinessTier] > TIER_RANK[normalizedProfileTier]
    ? normalizedBusinessTier
    : normalizedProfileTier;
}

export function hasEffectiveTierAccess(
  requiredTier: SubscriptionTier,
  profileTier: SubscriptionTier | undefined | null,
  businessTier: SubscriptionTier | undefined | null
): boolean {
  return hasTierAccess(requiredTier, getEffectiveTier(profileTier, businessTier));
}

export function hasEffectivePaidAccess(
  profileTier: SubscriptionTier | undefined | null,
  businessTier: SubscriptionTier | undefined | null
): boolean {
  return isPaidTier(getEffectiveTier(profileTier, businessTier));
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
      return 5;
    case 'standard':
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

  if (tier === 'gold') {
    return cycle === 'yearly'
      ? (siteSettings?.tier_gold_annual_price || 2900)
      : (siteSettings?.tier_gold_monthly_price || 299);
  }

  return 0; // Standard tier
}

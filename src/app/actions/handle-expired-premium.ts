'use server';

import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { SubscriptionTier } from '@/lib/types';

const PREMIUM_ACTIVE_TIERS = ['growth', 'gold'] as const;
const PREMIUM_TIER_FILTER = `tier.in.(${PREMIUM_ACTIVE_TIERS.join(',')})`;

export interface ExpiredPremiumResult {
  status: 'success' | 'error';
  message: string;
  data?: {
    usersAffected: number;
    businessesAffected: number;
  };
}

async function assertAuthorized(authToken?: string): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authToken && authToken === cronSecret) {
    return;
  }

  await verifyAdminSession();
}

/**
 * Function to handle expired premium accounts by updating their status in the database
 * This should be called periodically (e.g., via cron job) to update expired premium subscriptions
 */
export async function handleExpiredPremiumAccounts(authToken?: string): Promise<ExpiredPremiumResult> {
  try {
    await assertAuthorized(authToken);
  } catch (error: any) {
    return {
      status: 'error',
      message: error?.message || 'Non autorisé.',
    };
  }

  try {
    const serviceClient = await createAdminClient();

    // Get current timestamp
    const now = new Date().toISOString();

    // Update profiles with expired premium status
    const { data: expiredProfiles, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, business_id')
      .or(`${PREMIUM_TIER_FILTER},is_premium.eq.true`)
      .not('premium_expires_at', 'is', null)
      .lt('premium_expires_at', new Date().toISOString());

    if (profileError) {
      logger.error(`Error fetching expired profiles: ${profileError.message}`, profileError);
      return {
        status: 'error',
        message: `Error fetching expired profiles: ${profileError.message}`,
      };
    }

    if (expiredProfiles && expiredProfiles.length > 0) {
      // Update expired profiles
      const profileIds = expiredProfiles.map(p => p.id);

      const { error: updateProfileError } = await serviceClient
        .from('profiles')
        .update({
          is_premium: false,
          tier: 'standard' as SubscriptionTier,
          updated_at: now
        })
        .in('id', profileIds);

      if (updateProfileError) {
        logger.error('Error updating expired profiles', updateProfileError);
        return {
          status: 'error',
          message: `Error updating expired profiles: ${updateProfileError.message}`,
        };
      }

      // Update associated businesses (legacy profile.business_id + multi-business assignments)
      const businessIdSet = new Set<string>(
        expiredProfiles
          .map((p) => p.business_id)
          .filter((id): id is string => Boolean(id))
      );

      const { data: linkedBusinesses, error: linkedBusinessesError } = await serviceClient
        .from('user_businesses')
        .select('business_id')
        .in('user_id', profileIds);

      if (linkedBusinessesError) {
        logger.warn('Error fetching linked businesses for expired profiles', linkedBusinessesError);
      } else if (linkedBusinesses) {
        for (const link of linkedBusinesses) {
          if (link.business_id) {
            businessIdSet.add(link.business_id);
          }
        }
      }

      const businessIds = Array.from(businessIdSet);

      let businessesAffected = 0;
      if (businessIds.length > 0) {
        const { error: updateBusinessError } = await serviceClient
          .from('businesses')
          .update({
            is_premium: false,
            tier: 'standard' as SubscriptionTier,
            updated_at: now
          })
          .in('id', businessIds);

        if (updateBusinessError) {
          logger.warn('Error updating expired businesses', updateBusinessError);
          // Don't return error here as profiles were updated successfully
        } else {
          businessesAffected = businessIds.length;
        }
      }

      // Log the expiration events
      for (const profile of expiredProfiles) {
        try {
          // We'll use a direct SQL insert since we don't have a specific function for this
          // Since the RPC function may not exist, we'll skip logging for now to avoid errors
          // Future enhancement: create proper logging function for system-initiated premium changes
        } catch (logError: any) {
          logger.warn('Error logging premium expiration', { error: typeof logError === 'object' && logError?.message ? logError.message : String(logError), userId: profile.id });
          // Continue processing other profiles even if logging fails
        }
      }

      return {
        status: 'success',
        message: `${expiredProfiles.length} profiles and ${businessesAffected} businesses updated to non-premium status`,
        data: {
          usersAffected: expiredProfiles.length,
          businessesAffected
        }
      };
    } else {
      return {
        status: 'success',
        message: 'No expired premium accounts found',
        data: {
          usersAffected: 0,
          businessesAffected: 0
        }
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error in handleExpiredPremiumAccounts', error);
    return {
      status: 'error',
      message: `Unexpected error: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Function to get upcoming premium expirations for sending notifications
 */
export async function getUpcomingPremiumExpirations(daysAhead: number = 7, authToken?: string) {
  try {
    await assertAuthorized(authToken);
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Non autorisé.', data: [] };
  }

  try {
    const serviceClient = await createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    const cutoffDateString = cutoffDate.toISOString();

    const { data, error } = await serviceClient
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        tier,
        premium_expires_at
      `)
      .or(`${PREMIUM_TIER_FILTER},is_premium.eq.true`)
      .not('premium_expires_at', 'is', null)
      .gte('premium_expires_at', new Date().toISOString())
      .lte('premium_expires_at', cutoffDateString);

    if (error) {
      logger.error(`Error fetching upcoming premium expirations: ${error.message}`, error);
      return { status: 'error', message: error.message, data: [] };
    }

    return { status: 'success', message: 'Success', data };
  } catch (error: any) {
    logger.error('Unexpected error in getUpcomingPremiumExpirations', error);
    return { status: 'error', message: error.message, data: [] };
  }
}

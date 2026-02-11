'use server'

import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin'
import { ActionState, SubscriptionTier } from '@/lib/types'
import { logger } from '@/lib/logger'
import { getMaxBusinessesForTier } from '@/lib/tier-utils'

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_premium: boolean | null
  tier: SubscriptionTier | null
  business_id: string | null
}

const ASSIGNMENT_ROLES = new Set(['owner', 'manager', 'employee'])

async function resolveUserProfile(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userIdOrEmail: string
): Promise<UserProfile> {
  const isEmail = userIdOrEmail.includes('@')
  const query = supabase
    .from('profiles')
    .select('id, full_name, email, role, is_premium, tier, business_id')

  const { data, error } = isEmail
    ? await query.ilike('email', userIdOrEmail).single()
    : await query.eq('id', userIdOrEmail).single()

  if (error || !data) {
    throw new Error(isEmail ? 'User not found for email' : 'User not found')
  }

  return data as UserProfile
}

/**
 * Admin function to assign a business to a user
 * This function handles both the legacy profiles.business_id and new user_businesses table
 * 
 * @param userId - The UUID of the user (or email) to assign the business to
 * @param businessId - The ID of the business to assign
 * @param role - The role the user should have for this business (default: 'owner')
 * @param isPrimary - Whether this should be the user's primary business (default: false)
 * @returns ActionState with success/failure status and message
 */
export async function assignBusinessToUser(
  userId: string,
  businessId: string,
  role: string = 'owner',
  isPrimary: boolean = false
): Promise<ActionState> {
  try {
    const adminId = await verifyAdminSession()
    const supabase = await createAdminClient()

    if (!ASSIGNMENT_ROLES.has(role)) {
      return {
        status: 'error',
        message: 'Invalid assignment role'
      }
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single()

    if (businessError) {
      return {
        status: 'error',
        message: `Business not found: ${businessError.message}`
      }
    }

    const user = await resolveUserProfile(supabase, userId)
    const resolvedUserId = user.id

    // Check for conflicting assignments (other users who own this business)
    const { data: existingOwners } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', businessId)
      .eq('role', 'owner')

    if (existingOwners && existingOwners.length > 0) {
      const otherOwners = existingOwners.filter((owner: { user_id: string }) => owner.user_id !== resolvedUserId)
      if (otherOwners.length > 0) {
        logger.warn('Business has other owners', {
          businessId,
          currentUserId: resolvedUserId,
          otherOwnerIds: otherOwners.map(o => o.user_id)
        })
      }
    }

    // Enforce business limits (pro & growth can only have 1 business)
    const { data: existingAssignments } = await supabase
      .from('user_businesses')
      .select('business_id, is_primary')
      .eq('user_id', resolvedUserId)

    const resolvedTier: SubscriptionTier = user.tier || (user.is_premium ? 'pro' : 'none')
    const maxBusinesses = user.role === 'admin' ? Number.POSITIVE_INFINITY : getMaxBusinessesForTier(resolvedTier)

    if (user.role !== 'admin') {
      const existingBusinessIds = new Set<string>()

      if (existingAssignments && existingAssignments.length > 0) {
        for (const assignment of existingAssignments) {
          if (assignment.business_id) {
            existingBusinessIds.add(assignment.business_id)
          }
        }
      }

      if (user.business_id) {
        existingBusinessIds.add(user.business_id)
      }

      const { data: approvedClaims } = await supabase
        .from('business_claims')
        .select('business_id')
        .eq('user_id', resolvedUserId)
        .eq('status', 'approved')

      if (approvedClaims && approvedClaims.length > 0) {
        for (const claim of approvedClaims) {
          if (claim.business_id) {
            existingBusinessIds.add(claim.business_id)
          }
        }
      }

      // Allow re-assigning the same business, but block adding another one
      existingBusinessIds.delete(businessId)

      if (existingBusinessIds.size >= maxBusinesses) {
        return {
          status: 'error',
          message: 'This user already manages another business. Non-admin users are limited to one business. Remove the existing assignment/claim first.'
        }
      }
    }

    // Transaction: Remove any existing user-business relationship
    const { error: deleteError } = await supabase
      .from('user_businesses')
      .delete()
      .eq('user_id', resolvedUserId)
      .eq('business_id', businessId)

    if (deleteError) {
      logger.error('Error removing existing assignment', { 
        userId, 
        businessId, 
        error: deleteError.message 
      })
      // Don't fail completely, just log the error
    }

    // Create new user-business relationship
    const { error: insertError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: resolvedUserId,
        business_id: businessId,
        role,
        is_primary: isPrimary
      })

    if (insertError) {
      return {
        status: 'error',
        message: `Error creating business assignment: ${insertError.message}`
      }
    }

    // Update profile for backward compatibility
    // Only update if this is likely to be their main/first business
    const { data: userBusinessCount } = await supabase
      .from('user_businesses')
      .select('id')
      .eq('user_id', resolvedUserId)

    const isFirstBusiness = userBusinessCount?.length === 1
    const shouldUpdateProfile = isFirstBusiness || isPrimary

    if (shouldUpdateProfile) {
      const profileUpdate: any = {
        business_id: businessId
      }
      
      // Upgrade to pro role if they're currently a regular user
      if (user.role === 'user') {
        profileUpdate.role = 'pro'
      }
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', resolvedUserId)

      if (profileUpdateError) {
        logger.error('Error updating profile for backward compatibility', {
          userId,
          businessId,
          error: profileUpdateError.message
        })
        // Don't fail the main operation for this
      }
    }

    // Check for and optionally handle conflicting approved claims
    const { data: conflictingClaims } = await supabase
      .from('business_claims')
      .select('id, user_id, full_name')
      .eq('business_id', businessId)
      .eq('status', 'approved')
      .neq('user_id', resolvedUserId)

    if (conflictingClaims && conflictingClaims.length > 0) {
      logger.warn('Conflicting approved claims found', {
        businessId,
        userId,
        conflictingUserIds: conflictingClaims.map((c: { user_id: string }) => c.user_id)
      })
      // Note: We don't automatically reject claims - admin should handle manually
    }

    // Log the action
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: adminId,
          action: 'ASSIGN_BUSINESS_TO_USER',
          target_type: 'business_user_assignment',
          target_id: `${resolvedUserId}_${businessId}`,
          details: {
            user_id: resolvedUserId,
            business_id: businessId,
            role,
            is_primary: isPrimary,
            user_email: user.email,
            business_name: business.name,
            conflicting_claims: conflictingClaims?.length || 0
          },
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      logger.warn('Failed to log audit action', { error: logError })
    }

    return {
      status: 'success',
      message: `Successfully assigned "${business.name}" to ${user.full_name}`
    }

  } catch (error: any) {
    logger.error('Error in assignBusinessToUser', { 
      userId, 
      businessId, 
      role, 
      isPrimary, 
      error: error.message 
    })
    
    return {
      status: 'error',
      message: error.message || 'Failed to assign business to user'
    }
  }
}

/**
 * Admin function to remove a business assignment from a user
 * 
 * @param userId - The UUID of the user
 * @param businessId - The ID of the business to remove
 * @returns ActionState with success/failure status and message
 */
export async function removeBusinessFromUser(
  userId: string,
  businessId: string
): Promise<ActionState> {
  try {
    const adminId = await verifyAdminSession()
    const supabase = await createAdminClient()

    // Remove from user_businesses
    const { error: deleteError } = await supabase
      .from('user_businesses')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId)

    if (deleteError) {
      return {
        status: 'error',
        message: `Error removing business assignment: ${deleteError.message}`
      }
    }

    // Update profile if this was their primary business
    const { data: remainingBusinesses, error: remainingError } = await supabase
      .from('user_businesses')
      .select('business_id, is_primary')
      .eq('user_id', userId)

    if (remainingError) {
      logger.error('Error fetching remaining assignments', {
        userId,
        error: remainingError.message
      })
    } else if (remainingBusinesses && remainingBusinesses.length > 0) {
      // Set a new primary business if needed
      let currentPrimary = remainingBusinesses.find((b: { is_primary: boolean }) => b.is_primary)
      if (!currentPrimary) {
        const newPrimary = remainingBusinesses[0]
        const { error: primaryError } = await supabase
          .from('user_businesses')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('business_id', newPrimary.business_id)

        if (primaryError) {
          logger.error('Error setting new primary business', {
            userId,
            businessId: newPrimary.business_id,
            error: primaryError.message
          })
        } else {
          currentPrimary = { ...newPrimary, is_primary: true }
        }
      }

      const primaryBusinessId = currentPrimary?.business_id || remainingBusinesses[0]?.business_id
      if (primaryBusinessId) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ business_id: primaryBusinessId })
          .eq('id', userId)

        if (profileUpdateError) {
          logger.error('Error updating profile primary business', {
            userId,
            businessId: primaryBusinessId,
            error: profileUpdateError.message
          })
        }
      }
    } else {
      // No businesses left, reset profile business_id and downgrade if appropriate
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError) {
        logger.error('Error fetching profile for downgrade', {
          userId,
          error: profileError.message
        })
      } else {
        const updatePayload: { business_id: null; role?: string } = { business_id: null }
        if (profile?.role === 'pro') {
          updatePayload.role = 'user'
        }

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId)

        if (profileUpdateError) {
          logger.error('Error clearing profile business_id', {
            userId,
            error: profileUpdateError.message
          })
        }
      }
    }

    // Log the action
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: adminId,
          action: 'REMOVE_BUSINESS_FROM_USER',
          target_type: 'business_user_assignment',
          target_id: `${userId}_${businessId}`,
          details: {
            user_id: userId,
            business_id: businessId,
            remaining_businesses: remainingBusinesses?.length || 0
          },
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      logger.warn('Failed to log audit action', { error: logError })
    }

    return {
      status: 'success',
      message: 'Business assignment removed successfully'
    }

  } catch (error: any) {
    logger.error('Error in removeBusinessFromUser', { 
      userId, 
      businessId, 
      error: error.message 
    })
    
    return {
      status: 'error',
      message: error.message || 'Failed to remove business assignment'
    }
  }
}

/**
 * Admin function to get all business assignments for a user
 * 
 * @param userId - The UUID of the user
 * @returns Array of business assignments with business details
 */
export async function getUserBusinessAssignments(userId: string) {
  try {
    await verifyAdminSession()
    const supabase = await createAdminClient()

    // First, get user_businesses records (without joining businesses table initially)
    const { data: userBusinesses, error: userBusinessesError } = await supabase
      .from('user_businesses')
      .select(`
        business_id,
        role,
        is_primary,
        created_at
      `)
      .eq('user_id', userId)

    if (userBusinessesError) {
      logger.error('User businesses query error', {
        userId,
        errorCode: userBusinessesError.code,
        errorMessage: userBusinessesError.message
      });
      throw new Error(`Failed to fetch user business relationships: ${userBusinessesError.message}`)
    }

    // If no assignments, return empty array
    if (!userBusinesses || userBusinesses.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Get business details for each assignment
    const businessIds = userBusinesses.map(ub => ub.business_id);
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, category, city, overall_rating')
      .in('id', businessIds)

    if (businessesError) {
      logger.error('Businesses query error', {
        businessIds,
        errorCode: businessesError.code,
        errorMessage: businessesError.message
      });
      // Don't fail completely, just log the error and return assignments without business details
      logger.warn('Could not fetch business details, returning assignments with null business data');
    }

    // Combine user_businesses with business details
    const assignments = userBusinesses.map(ub => {
      const business = businesses?.find(b => b.id === ub.business_id);
      return {
        business_id: ub.business_id,
        role: ub.role,
        is_primary: ub.is_primary,
        created_at: ub.created_at,
        business: business ? {
          name: business.name,
          category: business.category,
          city: business.city,
          overall_rating: business.overall_rating
        } : {
          name: 'Unknown Business',
          category: 'Unknown',
          city: 'Unknown',
          overall_rating: 0
        }
      }
    });

    return {
      success: true,
      data: assignments
    }

  } catch (error: any) {
    // Better error logging with defensive extraction
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorDetails = {
      userId,
      error: errorMessage,
      errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
    
    logger.error('Error in getUserBusinessAssignments', errorDetails);
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

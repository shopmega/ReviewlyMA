'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  handleValidationError,
  handleDatabaseError,
  handleAuthenticationError,
  createErrorResponse,
  createSuccessResponse,
  logError,
  ErrorCode
} from '@/lib/errors';

export type AdminActionResult = {
  status: 'success' | 'error';
  message: string;
  data?: any;
};

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  message: string;
}

// Helper to create authenticated client
async function getAuthenticatedClient() {
  return await createClient();
}

// Helper to create service role client for privileged operations
async function getServiceClient() {
  return await createServiceClient();
}

// Verify caller is an admin
async function verifyAdmin(supabase: any): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, error: 'Non autorisé.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { isAdmin: false, error: 'Accès réservé aux administrateurs.' };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * Bulk update multiple reviews
 */
export async function bulkUpdateReviews(
  reviewIds: number[],
  updateData: {
    status?: 'published' | 'rejected';
    reason?: string;
  }
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Authentication required'],
        message: 'Vous devez être connecté pour effectuer cette opération.'
      };
    }

    const { isAdmin, userId, error: adminError } = await verifyAdmin(supabase);

    if (!isAdmin || adminError) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [adminError || 'Admin access required'],
        message: 'Accès réservé aux administrateurs.'
      };
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
      success: true
    };

    // Process each review
    for (const reviewId of reviewIds) {
      try {
        const { error } = await supabase
          .from('reviews')
          .update({
            status: updateData.status,
            ...(updateData.reason && {
              moderation_reason: updateData.reason,
              moderated_at: new Date().toISOString(),
              moderated_by: userId
            })
          })
          .eq('id', reviewId);

        if (error) {
          results.failed++;
          results.errors.push(`Review ${reviewId}: ${error.message}`);
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Review ${reviewId}: ${error}`);
      }
    }

    // Log bulk operation
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: userId,
        action: 'bulk_update_reviews',
        details: {
          review_ids: reviewIds,
          update_data: updateData,
          processed: results.processed,
          failed: results.failed,
          errors: results.errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/avis');

    return {
      ...results,
      message: `${results.processed} avis traités, ${results.failed} échecs`
    };
  } catch (error) {
    logError('bulk_update_reviews', error, { reviewIds, updateData });
    return {
      success: false,
      processed: 0,
      failed: reviewIds.length,
      errors: [(error as any)?.message || 'Unknown error'],
      message: 'Erreur lors de la mise à jour groupée.'
    };
  }
}

/**
 * Bulk delete multiple reviews
 */
export async function bulkDeleteReviews(
  reviewIds: number[]
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Authentication required'],
        message: 'Vous devez être connecté pour effectuer cette opération.'
      };
    }

    const { isAdmin, userId, error: adminError } = await verifyAdmin(supabase);

    if (!isAdmin || adminError) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [adminError || 'Admin access required'],
        message: 'Accès réservé aux administrateurs.'
      };
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
      success: true
    };

    // Process each review
    for (const reviewId of reviewIds) {
      try {
        const { error } = await supabase
          .from('reviews')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            deleted_by: userId
          })
          .eq('id', reviewId);

        if (error) {
          results.failed++;
          results.errors.push(`Review ${reviewId}: ${error.message}`);
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Review ${reviewId}: ${error}`);
      }
    }

    // Log bulk operation
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: userId,
        action: 'bulk_delete_reviews',
        details: {
          review_ids: reviewIds,
          processed: results.processed,
          failed: results.failed,
          errors: results.errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/avis');

    return {
      ...results,
      message: `${results.processed} avis supprimés, ${results.failed} échecs`
    };
  } catch (error) {
    logError('bulk_delete_reviews', error, { reviewIds });
    return {
      success: false,
      processed: 0,
      failed: reviewIds.length,
      errors: [(error as any)?.message || 'Unknown error'],
      message: 'Erreur lors de la suppression groupée.'
    };
  }
}

/**
 * Bulk update multiple businesses
 */
export async function bulkUpdateBusinesses(
  businessIds: string[],
  updateData: {
    status?: 'active' | 'suspended';
    is_premium?: boolean;
    featured?: boolean;
  }
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Authentication required'],
        message: 'Vous devez être connecté pour effectuer cette opération.'
      };
    }

    const { isAdmin, userId, error: adminError } = await verifyAdmin(supabase);

    if (!isAdmin || adminError) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [adminError || 'Admin access required'],
        message: 'Accès réservé aux administrateurs.'
      };
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
      success: true
    };

    // Process each business
    for (const businessId of businessIds) {
      try {
        const { error } = await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', businessId);

        if (error) {
          results.failed++;
          results.errors.push(`Business ${businessId}: ${error.message}`);
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Business ${businessId}: ${error}`);
      }
    }

    // Log bulk operation
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: userId,
        action: 'bulk_update_businesses',
        details: {
          business_ids: businessIds,
          update_data: updateData,
          processed: results.processed,
          failed: results.failed,
          errors: results.errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/etablissements');

    return {
      ...results,
      message: `${results.processed} établissements mis à jour, ${results.failed} échecs`
    };
  } catch (error) {
    logError('bulk_update_businesses', error, { businessIds, updateData });
    return {
      success: false,
      processed: 0,
      failed: businessIds.length,
      errors: [(error as any)?.message || 'Unknown error'],
      message: 'Erreur lors de la mise à jour groupée.'
    };
  }
}

/**
 * Bulk delete multiple businesses
 */
export async function bulkDeleteBusinesses(
  businessIds: string[]
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Authentication required'],
        message: 'Vous devez être connecté pour effectuer cette opération.'
      };
    }

    const { isAdmin, userId, error: adminError } = await verifyAdmin(supabase);

    if (!isAdmin || adminError) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [adminError || 'Admin access required'],
        message: 'Accès réservé aux administrateurs.'
      };
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
      success: true
    };

    // Process each business
    for (const businessId of businessIds) {
      try {
        const { error } = await supabase
          .from('businesses')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            deleted_by: userId
          })
          .eq('id', businessId);

        if (error) {
          results.failed++;
          results.errors.push(`Business ${businessId}: ${error.message}`);
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Business ${businessId}: ${error}`);
      }
    }

    // Log bulk operation
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: userId,
        action: 'bulk_delete_businesses',
        details: {
          business_ids: businessIds,
          processed: results.processed,
          failed: results.failed,
          errors: results.errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/etablissements');

    return {
      ...results,
      message: `${results.processed} établissements supprimés, ${results.failed} échecs`
    };
  } catch (error) {
    logError('bulk_delete_businesses', error, { businessIds });
    return {
      success: false,
      processed: 0,
      failed: businessIds.length,
      errors: [(error as any)?.message || 'Unknown error'],
      message: 'Erreur lors de la suppression groupée.'
    };
  }
}

/**
 * Bulk update multiple review reports
 */
export async function bulkUpdateReviewReports(
  reportIds: string[],
  status: 'resolved' | 'dismissed'
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, userId, error: adminError } = await verifyAdmin(supabase);
    if (!isAdmin || adminError) {
      return { success: false, processed: 0, failed: 0, errors: [adminError || 'Admin access required'], message: 'Accès réservé aux administrateurs.' };
    }

    const results = { processed: 0, failed: 0, errors: [] as string[], success: true };

    for (const reportId of reportIds) {
      try {
        const { error } = await supabase
          .from('review_reports')
          .update({ status, resolved_at: new Date().toISOString() })
          .eq('id', reportId);

        if (error) {
          results.failed++;
          results.errors.push(`Report ${reportId}: ${error.message}`);
        } else {
          results.processed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Report ${reportId}: ${error}`);
      }
    }

    revalidatePath('/admin/avis-signalements');

    return {
      ...results,
      message: `${results.processed} signalements traités`
    };
  } catch (error) {
    return { success: false, processed: 0, failed: reportIds.length, errors: [(error as any)?.message || 'Unknown error'], message: 'Erreur lors du traitement groupé.' };
  }
}

/**
 * Bulk update multiple business claims
 */
import { updateClaimStatus } from './claim-admin';

export async function bulkUpdateClaims(
  claimIds: string[],
  status: 'approved' | 'rejected',
  reason?: string
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, error: adminError } = await verifyAdmin(supabase);
    if (!isAdmin || adminError) {
      return { success: false, processed: 0, failed: 0, errors: [adminError || 'Admin access required'], message: 'Accès réservé aux administrateurs.' };
    }

    const results = { processed: 0, failed: 0, errors: [] as string[], success: true };

    for (const claimId of claimIds) {
      try {
        const result = await updateClaimStatus(claimId, status, reason);
        if (result.status === 'success') {
          results.processed++;
        } else {
          results.failed++;
          results.errors.push(`Claim ${claimId}: ${result.message}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Claim ${claimId}: ${error}`);
      }
    }

    revalidatePath('/admin/revendications');

    return {
      ...results,
      message: `${results.processed} revendications traitées`
    };
  } catch (error) {
    return { success: false, processed: 0, failed: claimIds.length, errors: [(error as any)?.message || 'Unknown error'], message: 'Erreur lors du traitement groupé.' };
  }
}

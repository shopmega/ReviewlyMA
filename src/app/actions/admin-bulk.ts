'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/errors';
import { updateClaimStatus } from './claim-admin';

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

async function getAuthenticatedClient() {
  return await createClient();
}

async function verifyAdmin(supabase: any): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { isAdmin: false, error: 'Non autorise.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { isAdmin: false, error: 'Acces reserve aux administrateurs.' };
  }

  return { isAdmin: true, userId: user.id };
}

function fail(message: string, failed: number, errors: string[]): BulkOperationResult {
  return { success: false, processed: 0, failed, errors, message };
}

function msg(label: string, processed: number, failed: number): string {
  return `${processed} ${label} traites, ${failed} echecs`;
}

async function resolveExistingIds(supabase: any, table: string, ids: Array<string | number>) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .in('id', ids as any[]);

  if (error) {
    return { error, existingIds: [] as Array<string | number>, missingIds: ids };
  }

  const existingIds = (data || []).map((r: any) => r.id) as Array<string | number>;
  const missingIds = ids.filter((id) => !existingIds.includes(id));
  return { error: null, existingIds, missingIds };
}

export async function bulkUpdateReviews(
  reviewIds: number[],
  updateData: { status?: 'published' | 'rejected'; reason?: string }
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, userId, error } = await verifyAdmin(supabase);
    if (!isAdmin || !userId || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);
    if (!reviewIds.length) return { success: true, processed: 0, failed: 0, errors: [], message: 'Aucun avis selectionne.' };

    const existing = await resolveExistingIds(supabase, 'reviews', reviewIds);
    if (existing.error) return fail('Erreur lors de la lecture des avis.', reviewIds.length, [existing.error.message]);

    if (existing.existingIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          status: updateData.status,
          ...(updateData.reason && {
            moderation_reason: updateData.reason,
            moderated_at: new Date().toISOString(),
            moderated_by: userId,
          }),
        })
        .in('id', existing.existingIds as number[]);
      if (updateError) return fail('Erreur lors de la mise a jour groupee.', reviewIds.length, [updateError.message]);
    }

    const errors = existing.missingIds.map((id) => `Review ${id}: not found`);

    await supabase.from('admin_audit_log').insert({
      admin_id: userId,
      action: 'bulk_update_reviews',
      details: {
        review_ids: reviewIds,
        update_data: updateData,
        processed: existing.existingIds.length,
        failed: existing.missingIds.length,
        errors,
      },
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/avis');
    return {
      success: true,
      processed: existing.existingIds.length,
      failed: existing.missingIds.length,
      errors,
      message: msg('avis', existing.existingIds.length, existing.missingIds.length),
    };
  } catch (e: any) {
    logError('bulk_update_reviews', e, { reviewIds, updateData });
    return fail('Erreur lors de la mise a jour groupee.', reviewIds.length, [e?.message || 'Unknown error']);
  }
}

export async function bulkDeleteReviews(reviewIds: number[]): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, userId, error } = await verifyAdmin(supabase);
    if (!isAdmin || !userId || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);
    if (!reviewIds.length) return { success: true, processed: 0, failed: 0, errors: [], message: 'Aucun avis selectionne.' };

    const existing = await resolveExistingIds(supabase, 'reviews', reviewIds);
    if (existing.error) return fail('Erreur lors de la lecture des avis.', reviewIds.length, [existing.error.message]);

    if (existing.existingIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .in('id', existing.existingIds as number[]);
      if (updateError) return fail('Erreur lors de la suppression groupee.', reviewIds.length, [updateError.message]);
    }

    const errors = existing.missingIds.map((id) => `Review ${id}: not found`);

    await supabase.from('admin_audit_log').insert({
      admin_id: userId,
      action: 'bulk_delete_reviews',
      details: {
        review_ids: reviewIds,
        processed: existing.existingIds.length,
        failed: existing.missingIds.length,
        errors,
      },
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/avis');
    return {
      success: true,
      processed: existing.existingIds.length,
      failed: existing.missingIds.length,
      errors,
      message: msg('avis', existing.existingIds.length, existing.missingIds.length),
    };
  } catch (e: any) {
    logError('bulk_delete_reviews', e, { reviewIds });
    return fail('Erreur lors de la suppression groupee.', reviewIds.length, [e?.message || 'Unknown error']);
  }
}

export async function bulkUpdateBusinesses(
  businessIds: string[],
  updateData: { status?: 'active' | 'suspended'; is_premium?: boolean; featured?: boolean; is_featured?: boolean }
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, userId, error } = await verifyAdmin(supabase);
    if (!isAdmin || !userId || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);
    if (!businessIds.length) return { success: true, processed: 0, failed: 0, errors: [], message: 'Aucun etablissement selectionne.' };

    const existing = await resolveExistingIds(supabase, 'businesses', businessIds);
    if (existing.error) return fail('Erreur lors de la lecture des etablissements.', businessIds.length, [existing.error.message]);

    if (existing.existingIds.length > 0) {
      const { featured, ...rest } = updateData;
      const normalizedUpdateData = {
        ...rest,
        ...(typeof featured === 'boolean' ? { is_featured: featured } : {}),
      };

      const { error: updateError } = await supabase
        .from('businesses')
        .update(normalizedUpdateData)
        .in('id', existing.existingIds as string[]);
      if (updateError) return fail('Erreur lors de la mise a jour groupee.', businessIds.length, [updateError.message]);
    }

    const errors = existing.missingIds.map((id) => `Business ${id}: not found`);

    await supabase.from('admin_audit_log').insert({
      admin_id: userId,
      action: 'bulk_update_businesses',
      details: {
        business_ids: businessIds,
        update_data: updateData,
        processed: existing.existingIds.length,
        failed: existing.missingIds.length,
        errors,
      },
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/etablissements');
    return {
      success: true,
      processed: existing.existingIds.length,
      failed: existing.missingIds.length,
      errors,
      message: msg('etablissements', existing.existingIds.length, existing.missingIds.length),
    };
  } catch (e: any) {
    logError('bulk_update_businesses', e, { businessIds, updateData });
    return fail('Erreur lors de la mise a jour groupee.', businessIds.length, [e?.message || 'Unknown error']);
  }
}

export async function bulkDeleteBusinesses(businessIds: string[]): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, userId, error } = await verifyAdmin(supabase);
    if (!isAdmin || !userId || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);
    if (!businessIds.length) return { success: true, processed: 0, failed: 0, errors: [], message: 'Aucun etablissement selectionne.' };

    const existing = await resolveExistingIds(supabase, 'businesses', businessIds);
    if (existing.error) return fail('Erreur lors de la lecture des etablissements.', businessIds.length, [existing.error.message]);

    if (existing.existingIds.length > 0) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .in('id', existing.existingIds as string[]);
      if (updateError) return fail('Erreur lors de la suppression groupee.', businessIds.length, [updateError.message]);
    }

    const errors = existing.missingIds.map((id) => `Business ${id}: not found`);

    await supabase.from('admin_audit_log').insert({
      admin_id: userId,
      action: 'bulk_delete_businesses',
      details: {
        business_ids: businessIds,
        processed: existing.existingIds.length,
        failed: existing.missingIds.length,
        errors,
      },
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/etablissements');
    return {
      success: true,
      processed: existing.existingIds.length,
      failed: existing.missingIds.length,
      errors,
      message: msg('etablissements', existing.existingIds.length, existing.missingIds.length),
    };
  } catch (e: any) {
    logError('bulk_delete_businesses', e, { businessIds });
    return fail('Erreur lors de la suppression groupee.', businessIds.length, [e?.message || 'Unknown error']);
  }
}

export async function bulkUpdateReviewReports(
  reportIds: string[],
  status: 'resolved' | 'dismissed'
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, error } = await verifyAdmin(supabase);
    if (!isAdmin || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);
    if (!reportIds.length) return { success: true, processed: 0, failed: 0, errors: [], message: 'Aucun signalement selectionne.' };

    const existing = await resolveExistingIds(supabase, 'review_reports', reportIds);
    if (existing.error) return fail('Erreur lors de la lecture des signalements.', reportIds.length, [existing.error.message]);

    if (existing.existingIds.length > 0) {
      const { error: updateError } = await supabase
        .from('review_reports')
        .update({ status, resolved_at: new Date().toISOString() })
        .in('id', existing.existingIds as string[]);
      if (updateError) return fail('Erreur lors du traitement groupe.', reportIds.length, [updateError.message]);
    }

    const errors = existing.missingIds.map((id) => `Report ${id}: not found`);
    revalidatePath('/admin/avis-signalements');
    return {
      success: true,
      processed: existing.existingIds.length,
      failed: existing.missingIds.length,
      errors,
      message: msg('signalements', existing.existingIds.length, existing.missingIds.length),
    };
  } catch (e: any) {
    return fail('Erreur lors du traitement groupe.', reportIds.length, [e?.message || 'Unknown error']);
  }
}

export async function bulkUpdateClaims(
  claimIds: string[],
  status: 'approved' | 'rejected',
  reason?: string
): Promise<BulkOperationResult> {
  const supabase = await getAuthenticatedClient();

  try {
    const { isAdmin, error } = await verifyAdmin(supabase);
    if (!isAdmin || error) return fail('Acces reserve aux administrateurs.', 0, [error || 'Admin access required']);

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
      } catch (e) {
        results.failed++;
        results.errors.push(`Claim ${claimId}: ${e}`);
      }
    }

    revalidatePath('/admin/revendications');
    return {
      ...results,
      message: msg('revendications', results.processed, results.failed),
    };
  } catch (e: any) {
    return fail('Erreur lors du traitement groupe.', claimIds.length, [e?.message || 'Unknown error']);
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createAuthClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';

export type AdminReviewAppeal = {
  id: string;
  review_id: number;
  appellant_user_id: string;
  appeal_type: 'author' | 'company_owner';
  message: string;
  status: 'open' | 'in_review' | 'accepted' | 'rejected';
  created_at: string;
  resolved_at: string | null;
  resolution_note?: string | null;
};

export async function getAdminReviewAppeals(): Promise<AdminReviewAppeal[]> {
  await verifyAdminPermission('moderation.review.bulk');
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('review_appeals')
    .select('id,review_id,appellant_user_id,appeal_type,message,status,created_at,resolved_at,resolution_note')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur chargement appels avis: ${error.message}`);
  }

  return (data || []) as AdminReviewAppeal[];
}

export async function resolveAdminReviewAppeal(
  appealId: string,
  status: 'accepted' | 'rejected',
  resolutionNote?: string | null,
): Promise<{ status: 'success' | 'error'; message: string }> {
  const adminId = await verifyAdminPermission('moderation.review.bulk');
  const authClient = await createAuthClient();

  const { data, error } = await authClient.rpc('resolve_review_appeal', {
    p_appeal_id: appealId,
    p_status: status,
    p_resolution_note: resolutionNote || null,
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (result?.success === false) {
    return { status: 'error', message: result.message || 'Echec de resolution' };
  }

  await logAuditAction({
    adminId,
    action: 'REVIEW_APPEAL_RESOLVED',
    targetType: 'review_appeal',
    targetId: appealId,
    details: {
      next_status: status,
      resolution_note: resolutionNote || null,
    },
  });

  revalidatePath('/admin/avis-appels');
  revalidatePath('/admin/moderation');
  revalidatePath('/admin/avis');

  return {
    status: 'success',
    message: status === 'accepted' ? 'Appel accepte.' : 'Appel rejete.',
  };
}

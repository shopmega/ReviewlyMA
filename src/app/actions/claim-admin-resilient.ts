'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ActionState } from '@/lib/types';
import { updateClaimStatus as updateClaimStatusBase } from './claim-admin';

export async function updateClaimStatus(
  claimId: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<ActionState> {
  const baseResult = await updateClaimStatusBase(claimId, status, reason);

  if (baseResult.status === 'success') {
    return baseResult;
  }

  const errorText = (baseResult.message || '').toLowerCase();
  const looksLikeSchemaCacheIssue =
    errorText.includes('rejection_reason') ||
    errorText.includes('reviewed_by') ||
    errorText.includes('schema cache');

  if (!looksLikeSchemaCacheIssue) {
    return baseResult;
  }

  const supabaseService = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );

  const { data: claim, error: claimError } = await supabaseService
    .from('business_claims')
    .select('business_id')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    return baseResult;
  }

  const { error: fallbackError } = await supabaseService
    .from('business_claims')
    .update({
      status,
      admin_notes: status === 'rejected' && reason ? reason : null,
    })
    .eq('id', claimId);

  if (fallbackError) {
    return baseResult;
  }

  revalidatePath(`/businesses/${claim.business_id}`);
  revalidatePath('/admin/revendications');
  revalidatePath('/');

  return {
    status: 'success',
    message: `Revendication ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès.`,
  };
}

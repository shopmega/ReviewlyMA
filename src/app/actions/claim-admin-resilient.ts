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

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  // Defense-in-depth: do not execute fallback unless caller is authenticated admin.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return baseResult;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') {
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

  const reviewedAt = new Date().toISOString();
  const adminNotes = status === 'rejected' && reason ? reason : null;

  // Progressive fallback payloads to survive partially stale schema cache.
  const fallbackPayloads: Array<Record<string, unknown>> = [
    {
      status,
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      rejection_reason: adminNotes,
      admin_notes: adminNotes,
    },
    {
      status,
      reviewed_at: reviewedAt,
      rejection_reason: adminNotes,
      admin_notes: adminNotes,
    },
    {
      status,
      reviewed_at: reviewedAt,
      admin_notes: adminNotes,
    },
    {
      status,
      admin_notes: adminNotes,
    },
  ];

  for (const payload of fallbackPayloads) {
    const { error: fallbackError } = await supabaseService
      .from('business_claims')
      .update(payload)
      .eq('id', claimId);

    if (!fallbackError) {
      revalidatePath(`/businesses/${claim.business_id}`);
      revalidatePath('/admin/revendications');
      revalidatePath('/');

      return {
        status: 'success',
        message: `Revendication ${status === 'approved' ? 'approuvee' : 'rejetee'} avec succes.`,
      };
    }

    const fallbackErrorText = (fallbackError.message || '').toLowerCase();
    const stillSchemaCacheIssue =
      fallbackErrorText.includes('rejection_reason') ||
      fallbackErrorText.includes('reviewed_by') ||
      fallbackErrorText.includes('schema cache');

    if (!stillSchemaCacheIssue) {
      break;
    }
  }

  return baseResult;
}

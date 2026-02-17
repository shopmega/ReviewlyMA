'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendClaimApprovalEmail, sendClaimRejectionEmail } from '@/app/actions/email';
import { ActionState, SubscriptionTier } from '@/lib/types';
import { getMaxBusinessesForTier } from '@/lib/tier-utils';

export async function updateClaimStatus(
  claimId: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<ActionState> {
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

  // 1) Verify caller is admin.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: 'error', message: 'Non autorise.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { status: 'error', message: 'Acces reserve aux administrateurs.' };
  }

  // 2) Service-role client for privileged updates.
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

  try {
    // 3) Load claim.
    const { data: claim, error: claimFetchError } = await supabaseService
      .from('business_claims')
      .select('*, businesses(name)')
      .eq('id', claimId)
      .single();

    if (claimFetchError || !claim) {
      return { status: 'error', message: 'Revendication introuvable.' };
    }

    const reviewedAt = new Date().toISOString();
    const rejectionReason = status === 'rejected' ? reason || null : null;

    // 4) Business/profile side effects needed only for approval.
    if (status === 'approved') {
      if (!claim.user_id) {
        return { status: 'error', message: "Erreur: cette revendication n'a pas d'utilisateur associe." };
      }

      const requestedUpdates =
        claim?.proof_data && typeof claim.proof_data === 'object'
          ? (claim.proof_data as Record<string, any>).requested_updates
          : null;

      // Check if user already reached tier business limit.
      const { data: existingProfile } = await supabaseService
        .from('profiles')
        .select('business_id, role, tier, is_premium')
        .eq('id', claim.user_id)
        .single();

      const isAdmin = existingProfile?.role === 'admin';
      if (!isAdmin) {
        const existingBusinessIds = new Set<string>();

        if (existingProfile?.business_id) {
          existingBusinessIds.add(existingProfile.business_id);
        }

        const { data: approvedClaims } = await supabaseService
          .from('business_claims')
          .select('business_id')
          .eq('user_id', claim.user_id)
          .eq('status', 'approved');

        if (approvedClaims) {
          approvedClaims.forEach((c) => existingBusinessIds.add(c.business_id));
        }

        const { data: assignments } = await supabaseService
          .from('user_businesses')
          .select('business_id')
          .eq('user_id', claim.user_id);

        if (assignments) {
          assignments.forEach((a) => existingBusinessIds.add(a.business_id));
        }

        existingBusinessIds.delete(claim.business_id);

        const userTier: SubscriptionTier =
          existingProfile?.tier || (existingProfile?.is_premium ? 'gold' : 'standard');
        const maxAllowed = getMaxBusinessesForTier(userTier);

        if (existingBusinessIds.size >= maxAllowed) {
          return {
            status: 'error',
            message: `Impossible d'approuver: cet utilisateur a atteint sa limite de ${maxAllowed} etablissement(s).`,
          };
        }
      }

      // Check business ownership conflict.
      const { data: businessData } = await supabaseService
        .from('businesses')
        .select('user_id')
        .eq('id', claim.business_id)
        .single();

      if (businessData?.user_id && businessData.user_id !== claim.user_id) {
        return {
          status: 'error',
          message: 'Cet etablissement est deja gere par un autre utilisateur.',
        };
      }

      // Update profile role and primary business.
      const { error: profileError } = await supabaseService
        .from('profiles')
        .update({
          business_id: claim.business_id,
          role: 'pro',
        })
        .eq('id', claim.user_id);

      if (profileError) {
        return { status: 'error', message: `Erreur mise a jour profil: ${profileError.message}` };
      }

      // Keep business owner in sync.
      const { error: businessUpdateError } = await supabaseService
        .from('businesses')
        .update({ user_id: claim.user_id })
        .eq('id', claim.business_id);
      if (businessUpdateError) {
        console.error('Error updating business owner:', businessUpdateError);
      }

      // Apply staged requested updates if present.
      if (requestedUpdates && typeof requestedUpdates === 'object' && Object.keys(requestedUpdates).length > 0) {
        const { error: requestedUpdateError } = await supabaseService
          .from('businesses')
          .update(requestedUpdates)
          .eq('id', claim.business_id);
        if (requestedUpdateError) {
          console.error('Error applying requested business updates:', requestedUpdateError);
        }
      }

      // Verify profile update.
      const { data: updatedProfile, error: verifyError } = await supabaseService
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', claim.user_id)
        .single();

      if (verifyError || !updatedProfile) {
        return { status: 'error', message: 'Erreur verification mise a jour profil.' };
      }
    }

    // 5) Persist moderation status.
    let claimStatusUpdated = false;
    let claimUpdateErrorMessage = '';

    const { error: claimUpdateError } = await supabaseService
      .from('business_claims')
      .update({
        status,
        reviewed_at: reviewedAt,
        reviewed_by: user.id,
        rejection_reason: rejectionReason,
      })
      .eq('id', claimId);

    if (!claimUpdateError) {
      claimStatusUpdated = true;
    } else {
      claimUpdateErrorMessage = claimUpdateError.message || 'Unknown claim update error';
      const claimUpdateErrorText = claimUpdateErrorMessage.toLowerCase();
      const looksLikeSchemaCacheIssue =
        claimUpdateErrorText.includes('rejection_reason') ||
        claimUpdateErrorText.includes('reviewed_by') ||
        claimUpdateErrorText.includes('schema cache');

      if (looksLikeSchemaCacheIssue) {
        const { error: fallbackUpdateError } = await supabaseService
          .from('business_claims')
          .update({
            status,
            reviewed_at: reviewedAt,
            admin_notes: rejectionReason,
          })
          .eq('id', claimId);

        if (!fallbackUpdateError) {
          claimStatusUpdated = true;
        } else {
          claimUpdateErrorMessage = fallbackUpdateError.message || claimUpdateErrorMessage;
        }
      }
    }

    if (!claimStatusUpdated) {
      return { status: 'error', message: `Erreur mise a jour revendication: ${claimUpdateErrorMessage}` };
    }

    // 6) Notifications and emails only after moderation status is persisted.
    if (status === 'approved') {
      try {
        await sendClaimApprovalEmail(claim.email, claim.full_name, claim.businesses?.name || 'Etablissement');
      } catch (emailError) {
        console.error('Error sending claim approval email:', emailError);
      }

      try {
        await supabaseService.from('notifications').insert({
          user_id: claim.user_id,
          title: 'Revendication approuvee',
          message: `Felicitations! Votre demande pour ${claim.businesses?.name || 'votre etablissement'} a ete approuvee.`,
          type: 'claim_approved',
          link: '/dashboard',
          is_read: false,
        });
      } catch (notificationError) {
        console.error('Error creating approval notification:', notificationError);
      }
    } else {
      try {
        await sendClaimRejectionEmail(claim.email, claim.full_name, claim.businesses?.name || 'Etablissement', reason);
      } catch (emailError) {
        console.error('Error sending claim rejection email:', emailError);
      }

      try {
        await supabaseService.from('notifications').insert({
          user_id: claim.user_id,
          title: 'Revendication refusee',
          message: `Votre demande pour ${claim.businesses?.name || "l'etablissement"} a ete refusee. ${reason ? `Raison: ${reason}` : ''}`,
          type: 'claim_rejected',
          link: '/dashboard/pending',
          is_read: false,
        });
      } catch (notificationError) {
        console.error('Error creating rejection notification:', notificationError);
      }
    }

    // 7) Revalidate cache.
    revalidatePath(`/businesses/${claim.business_id}`);
    revalidatePath('/admin/revendications');
    revalidatePath('/');

    return {
      status: 'success',
      message: `Revendication ${status === 'approved' ? 'approuvee' : 'rejetee'} avec succes.`,
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur imprevue est survenue.' };
  }
}

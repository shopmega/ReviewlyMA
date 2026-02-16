'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendClaimApprovalEmail, sendClaimRejectionEmail } from "@/app/actions/email";
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
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    // 1. Verify caller is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { status: 'error', message: 'Non autorisé.' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return { status: 'error', message: 'Accès réservé aux administrateurs.' };
    }

    // 2. Initialize service role client for updates
    const supabaseService = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() { return []; },
                setAll() { },
            },
        }
    );

    try {
        // 3. Get claim details
        const { data: claim, error: claimFetchError } = await supabaseService
            .from('business_claims')
            .select('*, businesses(name)')
            .eq('id', claimId)
            .single();

        if (claimFetchError || !claim) {
            return { status: 'error', message: 'Revendication introuvable.' };
        }

        // 4. Perform updates
        if (status === 'approved') {
            // Verify user_id exists (critical for pro access)
            if (!claim.user_id) {
                return { status: 'error', message: 'Erreur: Cette revendication n\'a pas d\'utilisateur associé.' };
            }
            const requestedUpdates =
                claim?.proof_data && typeof claim.proof_data === 'object'
                    ? (claim.proof_data as Record<string, any>).requested_updates
                    : null;


            // Check if user already has a business (prevent overwriting)
            const { data: existingProfile } = await supabaseService
                .from('profiles')
                .select('business_id, role, tier, is_premium')
                .eq('id', claim.user_id)
                .single();

            const isAdmin = existingProfile?.role === 'admin';
            if (!isAdmin) {
                const existingBusinessIds = new Set<string>();

                // 1. Check primary business in profile
                if (existingProfile?.business_id) {
                    existingBusinessIds.add(existingProfile.business_id);
                }

                // 2. Check other approved claims
                const { data: approvedClaims } = await supabaseService
                    .from('business_claims')
                    .select('business_id')
                    .eq('user_id', claim.user_id)
                    .eq('status', 'approved');

                if (approvedClaims) {
                    approvedClaims.forEach(c => existingBusinessIds.add(c.business_id));
                }

                // 3. Check assignments in user_businesses table
                const { data: assignments } = await supabaseService
                    .from('user_businesses')
                    .select('business_id')
                    .eq('user_id', claim.user_id);

                if (assignments) {
                    assignments.forEach(a => existingBusinessIds.add(a.business_id));
                }

                // Exclude the current claim business from the count of OTHER businesses
                existingBusinessIds.delete(claim.business_id);

                const userTier: SubscriptionTier = existingProfile?.tier || (existingProfile?.is_premium ? 'gold' : 'standard');
                const maxAllowed = getMaxBusinessesForTier(userTier);

                if (existingBusinessIds.size >= maxAllowed) {
                    return {
                        status: 'error',
                        message: `Impossible d'approuver : Cet utilisateur a atteint sa limite de ${maxAllowed} établissement(s).`
                    };
                }
            }
            // Check if business already has an owner before mutating profile state.
            const { data: businessData } = await supabaseService
                .from('businesses')
                .select('user_id')
                .eq('id', claim.business_id)
                .single();

            if (businessData?.user_id && businessData.user_id !== claim.user_id) {
                return {
                    status: 'error',
                    message: "Cet etablissement est deja gere par un autre utilisateur."
                };
            }

            // Update profile with role and business_id
            const { error: profileError } = await supabaseService
                .from('profiles')
                .update({
                    business_id: claim.business_id,
                    role: 'pro'
                })
                .eq('id', claim.user_id);

            if (profileError) {
                return { status: 'error', message: `Erreur lors de la mise a jour du profil: ${profileError.message}` };
            }

            // Update the business user_id (owner) as well (Critical for Claim Button persistence)
            const { error: businessUpdateError } = await supabaseService
                .from('businesses')
                .update({ user_id: claim.user_id })
                .eq('id', claim.business_id);

            if (businessUpdateError) {
                console.error('Error updating business owner:', businessUpdateError);
                // Continue but log error
            }
            if (requestedUpdates && typeof requestedUpdates === 'object' && Object.keys(requestedUpdates).length > 0) {
                const { error: requestedUpdateError } = await supabaseService
                    .from('businesses')
                    .update(requestedUpdates)
                    .eq('id', claim.business_id);

                if (requestedUpdateError) {
                    console.error('Error applying requested business updates:', requestedUpdateError);
                    // Continue but log error
                }
            }


            // Verify the update worked
            const { data: updatedProfile, error: verifyError } = await supabaseService
                .from('profiles')
                .select('id, business_id, role')
                .eq('id', claim.user_id)
                .single();

            if (verifyError || !updatedProfile) {
                return { status: 'error', message: 'Erreur lors de la vérification de la mise à jour du profil.' };
            }


            // Send approval email
            await sendClaimApprovalEmail(claim.email, claim.full_name, claim.businesses?.name || 'Établissement');

            // Send notification
            await supabaseService.from('notifications').insert({
                user_id: claim.user_id,
                title: 'Revendication approuvée !',
                message: `Félicitations ! Votre demande pour ${claim.businesses?.name || 'votre établissement'} a été approuvée. Vous avez maintenant accès au tableau de bord.`,
                type: 'claim_approved',
                link: '/dashboard',
                is_read: false
            });

        } else if (status === 'rejected') {
            // Send rejection email
            await sendClaimRejectionEmail(claim.email, claim.full_name, claim.businesses?.name || 'Établissement', reason);

            // Send notification
            await supabaseService.from('notifications').insert({
                user_id: claim.user_id,
                title: 'Revendication refusée',
                message: `Votre demande pour ${claim.businesses?.name || 'l\'établissement'} a été refusée. ${reason ? `Raison: ${reason}` : ''}`,
                type: 'claim_rejected',
                link: '/dashboard/pending', // Or generic link
                is_read: false
            });
        }

        // 5. Update claim status
        const { error: claimUpdateError } = await supabaseService
            .from('business_claims')
            .update({
                status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
                rejection_reason: status === 'rejected' ? reason : null
            })
            .eq('id', claimId);

        if (claimUpdateError) {
            return { status: 'error', message: `Erreur lors de la mise à jour de la revendication: ${claimUpdateError.message}` };
        }

        // 6. Revalidate cache
        revalidatePath(`/businesses/${claim.business_id}`);
        revalidatePath('/admin/revendications');
        revalidatePath('/');

        return { status: 'success', message: `Revendication ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès.` };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur imprévue est survenue.' };
    }
}


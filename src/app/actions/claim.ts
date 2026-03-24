'use server';

import { ActionState } from '@/lib/types';
import { checkRateLimit, recordAttempt, resetRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter-enhanced';
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
import {
    handleMultipleProofFiles,
    buildProofDataUpdates,
    type ProofFileType
} from '@/lib/file-handlers';
import { createClaimVerificationCodeRecord, sendClaimEmailVerificationCode } from '@/lib/claims/server';
import {
    buildClaimProofStatus,
    buildClaimRecordPayload,
    buildRequestedBusinessUpdates,
    getClaimProofPresence,
    parseClaimFormSubmission,
} from '@/lib/claims/submission';
import {
    getClaimEligibilityError,
    getClaimUserContext,
    resolveClaimBusiness,
    syncClaimUserProfile,
} from '@/lib/claims/workflow';
import { notifyAdmins } from '@/lib/notifications';

export type ClaimFormState = ActionState & { claimId?: string };


export async function submitClaim(
    prevState: ClaimFormState,
    formData: FormData
): Promise<ClaimFormState> {
    const supabase = await createClient();
    const supabaseService = await createServiceClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return handleAuthenticationError(
            'Vous devez être connecté pour soumettre une revendication.'
        ) as ClaimFormState;
    }

    const { currentUserProfile, existingClaims, isAdmin } = await getClaimUserContext({
        supabaseService,
        userId: user.id,
    });

    const eligibilityError = await getClaimEligibilityError({
        supabaseService,
        userId: user.id,
        currentUserProfile,
        existingClaims,
        isAdmin,
    });

    if (eligibilityError) {
        return createErrorResponse(
            ErrorCode.AUTHORIZATION_ERROR,
            eligibilityError
        ) as ClaimFormState;
    }

    try {
        const {
            documentFile,
            videoFile,
            logoFile,
            coverFile,
            validatedFields,
        } = parseClaimFormSubmission(formData);

        if (!validatedFields.success) {
            return handleValidationError(
                'Veuillez corriger les erreurs dans le formulaire.',
                validatedFields.error.flatten().fieldErrors as Record<string, string[]>
            ) as ClaimFormState;
        }

        const claimData = validatedFields.data;
        const { hasDocumentProof, hasVideoProof } = getClaimProofPresence({
            documentFile,
            videoFile,
        });

        if (!claimData.existingBusinessId && !claimData.phone && !claimData.website) {
            return handleValidationError(
                'Veuillez ajouter au moins un contact professionnel.',
                { phone: ['Ajoutez un téléphone professionnel ou un site web.'] }
            ) as ClaimFormState;
        }

        if (claimData.proofMethods.includes('document') && !hasDocumentProof) {
            return handleValidationError(
                'Veuillez fournir les preuves requises.',
                { documentFile: ['Un document est requis si cette méthode est sélectionnée.'] }
            ) as ClaimFormState;
        }

        if (claimData.proofMethods.includes('video') && !hasVideoProof) {
            return handleValidationError(
                'Veuillez fournir les preuves requises.',
                { videoFile: ['Une vidéo est requise si cette méthode est sélectionnée.'] }
            ) as ClaimFormState;
        }

        // Step 1: Create or update user profile
        // Sync identity only if profile fields are empty to avoid data corruption/overlapping
        const { error: profileError } = await syncClaimUserProfile({
            supabaseService,
            userId: user.id,
            currentUserProfile,
            claimData,
        });

        if (profileError && !profileError.message.includes('duplicate')) {
            logError('claim_profile_error', profileError, { userId: user.id });
            return handleDatabaseError(profileError) as ClaimFormState;
        }

        // Step 2: Get or create business
        let businessId;
        const requestedBusinessUpdates = buildRequestedBusinessUpdates(claimData);

        const businessResolution = await resolveClaimBusiness({
            supabaseService,
            claimData,
            requestedBusinessUpdates,
            isAdmin,
            isBusinessClaimed,
        });

        if ('error' in businessResolution && businessResolution.error) {
            return { status: 'error', message: businessResolution.error };
        }

        if ('updateError' in businessResolution) {
            logError('claim_business_update', businessResolution.updateError, { userId: user.id, businessId: businessResolution.businessId });
            return handleDatabaseError(businessResolution.updateError) as ClaimFormState;
        }

        if ('createError' in businessResolution) {
            logError('claim_business_creation', businessResolution.createError, { userId: user.id });
            return handleDatabaseError(businessResolution.createError) as ClaimFormState;
        }

        if ('missingId' in businessResolution) {
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Erreur: pas d\'ID établissement retourné.'
            ) as ClaimFormState;
        }

        businessId = businessResolution.businessId;

        // PREVENT DOUBLE SUBMISSION: Check if a pending claim already exists
        const { data: existingClaim } = await supabaseService
            .from('business_claims')
            .select('id')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .or('claim_state.eq.verification_pending,status.eq.pending')
            .maybeSingle();

        if (existingClaim) {
            return createErrorResponse(
                ErrorCode.CONFLICT,
                'Vous avez déjà une demande en cours pour cet établissement.'
            ) as ClaimFormState;
        }

        const proofStatus = buildClaimProofStatus({
            proofMethods: claimData.proofMethods,
            hasDocumentProof,
            hasVideoProof,
        });

        const claimPayload = buildClaimRecordPayload({
            userId: user.id,
            businessId,
            claimData,
            proofStatus,
            hasDocumentProof,
            hasVideoProof,
            isAdmin,
            requestedBusinessUpdates,
        });

        const { data: claimData_response, error: claimError } = await supabaseService
            .from('business_claims')
            .insert([claimPayload])
            .select('id')
            .single();

        if (claimError) {
            logError('claim_creation_error', claimError, { userId: user.id, businessId });
            return handleDatabaseError(claimError) as ClaimFormState;
        }

        if (!claimData_response?.id) {
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Erreur: pas d\'ID revendication retourné.'
            ) as ClaimFormState;
        }

        // Step 5: Upload proof files using consolidated handler
        const batch = await handleMultipleProofFiles(
            { document: documentFile, video: videoFile, logo: logoFile, cover: coverFile },
            claimData_response.id,
            supabaseService
        );

        if (batch.failedUploads.length > 0) {
            logError('claim_file_upload_partial', new Error('Some files failed to upload'), {
                failedFiles: batch.failedUploads
            });
            // Continue even if some files fail - don't block claim creation
        }

        // Build updates from successful file uploads
        const fileUpdates = buildProofDataUpdates(batch.results);

        // Update claim with file URLs
        if (Object.keys(fileUpdates).length > 0) {
            await supabaseService
                .from('business_claims')
                .update({ proof_data: { ...claimPayload.proof_data, ...fileUpdates } })
                .eq('id', claimData_response.id);
        }

        // Step 6: Generate and send verification codes/emails based on selected methods
        for (const method of claimData.proofMethods) {
            try {
                await generateVerificationCode(method, claimData_response.id, claimData.email);
            } catch (codeError) {
                logError('verification_code_generation', codeError, { method, claimId: claimData_response.id });
                // Don't block claim on code generation failure
            }
        }

        await notifyAdmins({
            title: 'Nouvelle revendication a valider',
            message: `${claimData.fullName} a soumis une revendication pour ${claimData.businessName}.`,
            type: 'admin_claim_pending',
            link: '/admin/revendications',
        });

        return createSuccessResponse(
            'Revendication soumise avec succès! Vérifiez votre email pour les prochaines étapes.',
            { claimId: claimData_response.id }
        ) as ClaimFormState;
    } catch (error) {
        logError('claim_submission_unexpected', error, { userId: user.id });
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de la soumission.'
        ) as ClaimFormState;
    }
}

async function generateVerificationCode(method: string, claimId: string, email: string): Promise<void> {
    try {
        const supabase = await createClient();

        if (method === 'email') {
            const { code } = await createClaimVerificationCodeRecord({
                supabase,
                claimId,
                method: 'email',
            });
            await sendClaimEmailVerificationCode({ email, code });

        } else if (method === 'phone') {
            await createClaimVerificationCodeRecord({
                supabase,
                claimId,
                method: 'phone',
            });

            // For phone, still just log for now as we don't have SMS service integrated
        }
    } catch (error) {
        console.error(`Error generating verification code for ${method}:`, error);
    }
}

export async function verifyClaimCode(claimId: string, code: string): Promise<ClaimFormState> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { status: 'error', message: 'Vous devez être connecté.' };
        }

        const { data: claim, error: claimError } = await supabase
            .from('business_claims')
            .select('id, user_id')
            .eq('id', claimId)
            .single();

        if (claimError || !claim) {
            return { status: 'error', message: 'Revendication introuvable.' };
        }

        if (claim.user_id !== user.id) {
            return { status: 'error', message: 'Accès non autorisé.' };
        }

        const rateKey = `verify-${user.id}-${claimId}`;
        const { isLimited, retryAfterSeconds } = await checkRateLimit(rateKey, RATE_LIMIT_CONFIG.verification);
        if (isLimited) {
            return {
                status: 'error',
                message: `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
            };
        }

        // Find the verification code
        const { data: codeData, error: codeError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('claim_id', claimId)
            .eq('code', code)
            .eq('verified', false)
            .single();

        if (codeError || !codeData) {
            await recordAttempt(rateKey, RATE_LIMIT_CONFIG.verification);
            return { status: 'error', message: 'Code invalide ou expiré.' };
        }

        // Check expiration
        if (new Date(codeData.expires_at) < new Date()) {
            await recordAttempt(rateKey, RATE_LIMIT_CONFIG.verification);
            return { status: 'error', message: 'Le code a expiré. Veuillez demander un nouveau code.' };
        }

        // Mark verification code as verified
        const { error: codeUpdateError } = await supabase
            .from('verification_codes')
            .update({ verified: true, verified_at: new Date().toISOString() })
            .eq('id', codeData.id);

        if (codeUpdateError) {
            console.error('Error marking code as verified:', codeUpdateError);
            return { status: 'error', message: 'Erreur lors de la vérification du code.' };
        }

        // ATOMIC JSON UPDATE - No race condition!
        // Use PostgreSQL jsonb_set via RPC to atomically update proof_status
        // This ensures concurrent verifications don't overwrite each other
        const { error: proofUpdateError, data: updatedClaim } = await supabase
            .rpc('update_claim_proof_status', {
                p_claim_id: claimId,
                p_method: codeData.method,
                p_status: 'verified',
            });

        if (proofUpdateError) {
            console.error('Error updating proof status:', proofUpdateError);
            return { status: 'error', message: 'Erreur lors de la mise à jour du statut de vérification.' };
        }

        await resetRateLimit(rateKey);

        console.log('Verification successful:', {
            claimId,
            method: codeData.method,
            proofStatus: updatedClaim?.proof_status,
        });

        return {
            status: 'success',
            message: `Votre ${codeData.method === 'email' ? 'email' : 'téléphone'} a été vérifié avec succès!`,
        };
    } catch (error) {
        console.error('Verification error:', error);
        return { status: 'error', message: 'Une erreur est survenue lors de la vérification.' };
    }
}

export async function isBusinessClaimed(businessId: string) {
    const supabase = await createServiceClient();

    // Check if there's an approved claim for this business
    const { data, error } = await supabase
        .from('business_claims')
        .select('id, status, claim_state, user_id')
        .eq('business_id', businessId)
        .or('claim_state.eq.verified,status.eq.approved')
        .maybeSingle();

    if (error) {
        // If no records found, the business is not claimed
        if (error.code === 'PGRST116') {
            return false;
        }
        console.error('Error checking business claim status:', error);
        return false;
    }

    return !!data;
}

/**
 * Check if the current user has a claim (pending or approved) for this business
 */
export async function getUserBusinessClaim(businessId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('business_claims')
        .select('id, status, created_at')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error checking user business claim:', error);
        return null;
    }

    return data;
}

/**
 * TIER 3 FEATURE: Resend verification code
 * Allows users to request a new verification code if expired
 */
export async function resendVerificationCode(
    claimId: string,
    method: string
): Promise<ActionState> {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { status: 'error', message: 'Vous devez ??tre connect??.' };
        }

        const { data: claim } = await supabase
            .from('business_claims')
            .select('id, user_id, email, proof_methods')
            .eq('id', claimId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!claim) {
            return { status: 'error', message: 'Revendication non trouv??e ou non autoris??e.' };
        }

        if (!['email', 'phone', 'document'].includes(method)) {
            return { status: 'error', message: 'M??thode de v??rification invalide.' };
        }

        const normalizedMethod = method as 'email' | 'phone';
        const { code: verificationCode } = await createClaimVerificationCodeRecord({
            supabase,
            claimId,
            method: normalizedMethod,
            replaceExisting: true,
        });

        if (method === 'email') {
            try {
                await sendClaimEmailVerificationCode({
                    email: claim.email,
                    code: verificationCode,
                });

                console.log(`Verification email sent for ${claim.email}`);
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
            }
        }

        return {
            status: 'success',
            message: 'Un nouveau code de v??rification a ??t?? envoy??. Valide pendant 24 heures.',
        };
    } catch (error) {
        console.error('Error resending verification code:', error);
        return {
            status: 'error',
            message: 'Une erreur est survenue. Veuillez r??essayer.',
        };
    }
}

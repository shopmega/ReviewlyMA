'use server';

import { claimSchema, ActionState, SubscriptionTier } from '@/lib/types';
import { checkRateLimit, recordAttempt, clearRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
    handleValidationError,
    handleDatabaseError,
    handleAuthenticationError,
    handleFileUploadError,
    createErrorResponse,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/errors';
import {
    handleMultipleProofFiles,
    buildProofDataUpdates,
    getFileErrorMessage,
    type ProofFileType
} from '@/lib/file-handlers';
import { sendEmail, emailTemplates } from '@/lib/email-service';
import { getSiteSettings } from '@/lib/data';
import { getMaxBusinessesForTier } from '@/lib/tier-utils';
import { getSiteName } from '@/lib/site-config';
import { notifyAdmins } from '@/lib/notifications';
import { sanitizeBusinessGalleryUrls, sanitizeBusinessMediaPath } from '@/lib/business-media';

export type ClaimFormState = ActionState & { claimId?: string };

interface ClaimData {
    // Step 1: Business Details
    businessName: string;
    category: string;
    subcategory: string;
    address: string;
    city: string;
    quartier: string;
    phone?: string;
    website?: string;
    description?: string;
    amenities: string[];

    // Step 2: Identity & Proof
    fullName: string;
    position: string;
    claimerType: 'owner' | 'co_owner' | 'legal_representative' | 'manager' | 'marketing_manager' | 'agency_representative' | 'employee_delegate' | 'other';
    claimerTitle?: string;
    email: string;
    personalPhone: string;
    proofMethods: string[];
    messageToAdmin?: string;

    // Existing Business
    existingBusinessId?: string;
}


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

    // BLOCKER: Prevent multiple business claims per user
    // Get profile to check for admin status and existing data
    const { data: currentUserProfile } = await supabaseService
        .from('profiles')
        .select('business_id, role, tier, full_name, email, is_premium')
        .eq('id', user.id)
        .single();

    const isAdmin = currentUserProfile?.role === 'admin';

    // 1. Check for existing claims (approved or pending)
    const { data: existingClaims } = await supabaseService
        .from('business_claims')
        .select('id, status, business_id')
        .eq('user_id', user.id);

    if (!isAdmin) {
        // Count unique businesses already managed
        const managedBusinessIds = new Set<string>();

        // From profile
        if (currentUserProfile?.business_id) {
            managedBusinessIds.add(currentUserProfile.business_id);
        }

        // From approved claims
        existingClaims?.filter(c => c.status === 'approved').forEach(c => managedBusinessIds.add(c.business_id));

        // From user_businesses assignments
        const { data: assignments } = await supabaseService
            .from('user_businesses')
            .select('business_id')
            .eq('user_id', user.id);

        assignments?.forEach(a => managedBusinessIds.add(a.business_id));

        const maxAllowed = getMaxBusinessesForTier(currentUserProfile?.tier as SubscriptionTier || 'standard');

        if (managedBusinessIds.size >= maxAllowed) {
            return createErrorResponse(
                ErrorCode.AUTHORIZATION_ERROR,
                `Vous gérez déjà le nombre maximum d'établissements autorisé pour votre offre (${maxAllowed}).`
            ) as ClaimFormState;
        }
    }

    // Also check for pending claims - usually we only want 1 pending at a time
    const hasPending = existingClaims?.some(c => c.status === 'pending');
    if (hasPending) {
        return createErrorResponse(
            ErrorCode.AUTHORIZATION_ERROR,
            'Vous avez déjà une demande de revendication en cours. Veuillez attendre sa validation avant d\'en soumettre une autre.'
        ) as ClaimFormState;
    }

    try {
        // Parse form data
        const entries = Object.fromEntries(formData.entries());

        // Handle array fields
        const amenities = (formData.get('amenities') as string)?.split(',').filter(Boolean) || [];
        const proofMethods = (formData.get('proofMethods') as string)?.split(',').filter(Boolean) || [];

        // Extract file objects separately to avoid including them in validation
        const documentFile = formData.get('documentFile') as File | string | null;
        const videoFile = formData.get('videoFile') as File | string | null;
        const logoFile = formData.get('logoFile') as File | null;
        const coverFile = formData.get('coverFile') as File | null;

        // Prepare data for validation, excluding files
        const dataForValidation = {
            ...entries,
            amenities,
            proofMethods,
            documentFile: undefined,
            videoFile: undefined,
            logoFile: undefined,
            coverFile: undefined,
            galleryFiles: undefined,
        };

        const validatedFields = claimSchema.safeParse(dataForValidation);

        if (!validatedFields.success) {
            return handleValidationError(
                'Veuillez corriger les erreurs dans le formulaire.',
                validatedFields.error.flatten().fieldErrors as Record<string, string[]>
            ) as ClaimFormState;
        }

        const claimData = validatedFields.data;
        const hasDocumentProof = typeof documentFile === 'string' ? documentFile.trim().length > 0 : !!documentFile;
        const hasVideoProof = typeof videoFile === 'string' ? videoFile.trim().length > 0 : !!videoFile;

        if (!claimData.existingBusinessId && !claimData.phone && !claimData.website) {
            return handleValidationError(
                'Veuillez ajouter au moins un contact professionnel.',
                { phone: ['Ajoutez un tÃ©lÃ©phone professionnel ou un site web.'] }
            ) as ClaimFormState;
        }

        if (claimData.proofMethods.includes('document') && !hasDocumentProof) {
            return handleValidationError(
                'Veuillez fournir les preuves requises.',
                { documentFile: ['Un document est requis si cette mÃ©thode est sÃ©lectionnÃ©e.'] }
            ) as ClaimFormState;
        }

        if (claimData.proofMethods.includes('video') && !hasVideoProof) {
            return handleValidationError(
                'Veuillez fournir les preuves requises.',
                { videoFile: ['Une vidÃ©o est requise si cette mÃ©thode est sÃ©lectionnÃ©e.'] }
            ) as ClaimFormState;
        }

        // Step 1: Create or update user profile
        // Sync identity only if profile fields are empty to avoid data corruption/overlapping
        const profileUpdates: any = {
            id: user.id,
            role: currentUserProfile?.role || 'user',
            business_id: currentUserProfile?.business_id || null,
        };

        if (!currentUserProfile?.full_name) {
            profileUpdates.full_name = claimData.fullName;
        }
        if (!currentUserProfile?.email) {
            profileUpdates.email = claimData.email;
        }

        const { error: profileError } = await supabaseService
            .from('profiles')
            .upsert(profileUpdates, { onConflict: 'id' });

        if (profileError && !profileError.message.includes('duplicate')) {
            logError('claim_profile_error', profileError, { userId: user.id });
            return handleDatabaseError(profileError) as ClaimFormState;
        }

        // Step 2: Get or create business
        let businessId;
        const requestedBusinessUpdates: Record<string, any> = {
            amenities: claimData.amenities,
        };

        if (claimData.description) {
            requestedBusinessUpdates.description = claimData.description;
        }

        if (claimData.website) {
            requestedBusinessUpdates.website = claimData.website;
        }

        if (claimData.phone) {
            requestedBusinessUpdates.phone = claimData.phone;
        }

        if (claimData.existingBusinessId) {
            // Check if the existing business is already claimed
            const isAlreadyClaimed = await isBusinessClaimed(claimData.existingBusinessId);
            if (isAlreadyClaimed) {
                return { status: 'error', message: 'Cet établissement a déjà été revendiqué par un autre utilisateur.' };
            }

            // Use existing business and update it with claim data
            businessId = claimData.existingBusinessId;

            // Only admins can update business data immediately.
            // For non-admins, changes are staged in claim proof_data and applied on approval.
            if (isAdmin && Object.keys(requestedBusinessUpdates).length > 0) {
                const { error: updateError } = await supabaseService
                    .from('businesses')
                    .update(requestedBusinessUpdates)
                    .eq('id', businessId);

                if (updateError) {
                    logError('claim_business_update', updateError, { userId: user.id, businessId });
                    return handleDatabaseError(updateError) as ClaimFormState;
                }
            }
        } else {
            // Create new business
            const businessPayload = {
                id: `${claimData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
                name: claimData.businessName,
                type: 'commerce',
                category: claimData.category,
                subcategory: claimData.subcategory,
                city: claimData.city,
                quartier: claimData.quartier,
                location: `${claimData.address}, ${claimData.quartier}, ${claimData.city}`,
                description: claimData.description || 'A completer',
                website: claimData.website || null,
                amenities: claimData.amenities,
                overall_rating: 0,
                is_featured: false,
                logo_url: null,
                logo_hint: null,
                cover_url: null,
                cover_hint: null,
                tags: [],
            };

            const { data: businessData, error: businessError } = await supabaseService
                .from('businesses')
                .insert([businessPayload])
                .select('id')
                .single();

            if (businessError) {
                logError('claim_business_creation', businessError, { userId: user.id });
                return handleDatabaseError(businessError) as ClaimFormState;
            }

            if (!businessData?.id) {
                return createErrorResponse(
                    ErrorCode.SERVER_ERROR,
                    'Erreur: pas d\'ID établissement retourné.'
                ) as ClaimFormState;
            }

            businessId = businessData.id;
        }

        // PREVENT DOUBLE SUBMISSION: Check if a pending claim already exists
        const { data: existingClaim } = await supabaseService
            .from('business_claims')
            .select('id')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingClaim) {
            return createErrorResponse(
                ErrorCode.CONFLICT,
                'Vous avez déjà une demande en cours pour cet établissement.'
            ) as ClaimFormState;
        }

        // Step 3: Create claim record with proof methods
        // Never trust client-side verification flags.
        const emailVerified = false;
        const phoneVerified = false;

        // Initialize proof status with verification flags
        const proofStatus = claimData.proofMethods.reduce((acc, method) => {
            if (method === 'email') {
                acc[method] = emailVerified ? 'verified' : 'pending';
            } else if (method === 'phone') {
                acc[method] = phoneVerified ? 'verified' : 'pending';
            } else if (method === 'document') {
                acc[method] = hasDocumentProof ? 'pending_review' : 'pending';
            } else if (method === 'video') {
                acc[method] = hasVideoProof ? 'pending_review' : 'pending';
            } else {
                acc[method] = 'pending';
            }
            return acc;
        }, {} as Record<string, string>);

        const claimPayload = {
            user_id: user.id,
            business_id: businessId,
            full_name: claimData.fullName,
            job_title: claimData.position,
            claimer_type: claimData.claimerType,
            claimer_title: claimData.claimerTitle || null,
            email: claimData.email,
            phone: claimData.personalPhone,
            status: 'pending',
            proof_methods: claimData.proofMethods,
            proof_status: proofStatus,
            proof_data: {
                email_verified: emailVerified,
                phone_verified: phoneVerified,
                document_uploaded: hasDocumentProof,
                video_uploaded: hasVideoProof,
                verified_at: new Date().toISOString(),
                ...(claimData.existingBusinessId && !isAdmin && Object.keys(requestedBusinessUpdates).length > 0
                    ? { requested_updates: requestedBusinessUpdates }
                    : {}),
            },
            message: claimData.messageToAdmin,
        };

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
        const settings = await getSiteSettings();
        const siteName = getSiteName(settings);

        if (method === 'email') {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await supabase.from('verification_codes').insert([{
                claim_id: claimId,
                method: 'email',
                code: code,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }]);

            // Send actual email
            await sendEmail({
                to: email,
                subject: emailTemplates.verificationCode.subject(code),
                html: emailTemplates.verificationCode.html({ code, siteName }),
            });

        } else if (method === 'phone') {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await supabase.from('verification_codes').insert([{
                claim_id: claimId,
                method: 'phone',
                code: code,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }]);

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
        const { isLimited, retryAfterSeconds } = checkRateLimit(rateKey, RATE_LIMIT_CONFIG.verification);
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
            recordAttempt(rateKey, RATE_LIMIT_CONFIG.verification);
            return { status: 'error', message: 'Code invalide ou expiré.' };
        }

        // Check expiration
        if (new Date(codeData.expires_at) < new Date()) {
            recordAttempt(rateKey, RATE_LIMIT_CONFIG.verification);
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

        clearRateLimit(rateKey);

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
        .select('id, status, user_id')
        .eq('business_id', businessId)
        .eq('status', 'approved')
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

// Helper to generate unique file names (prevents collision race condition)
function generateUniqueFilePath(basePath: string, fileExtension: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    return `${basePath}-${timestamp}-${randomId}.${fileExtension}`;
}

async function uploadProofFiles(supabaseService: any, claimId: string, documentFile: File | string | null, videoFile: File | string | null, proofStatus: Record<string, string>) {
    const { data: claim } = await supabaseService
        .from('business_claims')
        .select('proof_data')
        .eq('id', claimId)
        .maybeSingle();

    if (!claim) {
        // Handle missing claim
        return;
    }

    let currentProofData = claim?.proof_data || {};
    let updates: any = { ...currentProofData };

    if (documentFile) {
        try {
            let docPath = '';
            if (typeof documentFile === 'string') {
                docPath = documentFile;
            } else {
                const docBuffer = await documentFile.arrayBuffer();
                const fileExt = documentFile.name.split('.').pop() || 'pdf';
                // FIXED: Use timestamp + random ID to prevent collision
                docPath = generateUniqueFilePath(`claims/${claimId}/document`, fileExt);
                await supabaseService.storage
                    .from('claim-proofs')
                    .upload(docPath, docBuffer, {
                        contentType: documentFile.type,
                        upsert: false,
                    });
            }
            updates.document_url = docPath;
            updates.document_uploaded = true;
        } catch (error) {
            console.error('Error handling document:', error);
        }
    }

    if (videoFile) {
        try {
            let vidPath = '';
            if (typeof videoFile === 'string') {
                vidPath = videoFile;
            } else {
                const vidBuffer = await videoFile.arrayBuffer();
                const fileExt = videoFile.name.split('.').pop() || 'mp4';
                // FIXED: Use timestamp + random ID to prevent collision
                vidPath = generateUniqueFilePath(`claims/${claimId}/video`, fileExt);
                await supabaseService.storage
                    .from('claim-proofs')
                    .upload(vidPath, vidBuffer, {
                        contentType: videoFile.type,
                        upsert: false,
                    });
            }
            updates.video_url = vidPath;
            updates.video_uploaded = true;
        } catch (error) {
            console.error('Error handling video:', error);
        }
    }

    if (Object.keys(updates).length > 0) {
        await supabaseService
            .from('business_claims')
            .update({
                proof_data: updates,
            })
            .eq('id', claimId);
    }
}

async function uploadBusinessImages(supabaseService: any, businessId: string, logoFile: File | string | null, coverFile: File | string | null, galleryFiles: (File | string)[]) {
    let businessImages: { logo_url?: string; cover_url?: string; gallery_urls?: string[] } = {};

    if (logoFile) {
        try {
            if (typeof logoFile === 'string') {
                const sanitizedLogoPath = sanitizeBusinessMediaPath(logoFile);
                if (sanitizedLogoPath) {
                    businessImages.logo_url = sanitizedLogoPath;
                }
            } else {
                const logoBuffer = await logoFile.arrayBuffer();
                const fileExt = logoFile.name.split('.').pop() || 'png';
                // FIXED: Use timestamp + random ID to prevent collision
                const logoPath = generateUniqueFilePath(`businesses/${businessId}/logo`, fileExt);
                await supabaseService.storage
                    .from('business-images')
                    .upload(logoPath, logoBuffer, {
                        contentType: logoFile.type,
                        upsert: false,
                    });
                businessImages.logo_url = logoPath;
            }
        } catch (error) {
            console.error('Error handling logo:', error);
        }
    }

    if (coverFile) {
        try {
            if (typeof coverFile === 'string') {
                const sanitizedCoverPath = sanitizeBusinessMediaPath(coverFile);
                if (sanitizedCoverPath) {
                    businessImages.cover_url = sanitizedCoverPath;
                }
            } else {
                const coverBuffer = await coverFile.arrayBuffer();
                const fileExt = coverFile.name.split('.').pop() || 'png';
                // FIXED: Use timestamp + random ID to prevent collision
                const coverPath = generateUniqueFilePath(`businesses/${businessId}/cover`, fileExt);
                await supabaseService.storage
                    .from('business-images')
                    .upload(coverPath, coverBuffer, {
                        contentType: coverFile.type,
                        upsert: false,
                    });
                businessImages.cover_url = coverPath;
            }
        } catch (error) {
            console.error('Error handling cover:', error);
        }
    }

    if (galleryFiles && galleryFiles.length > 0) {
        const galleryUrls: string[] = [];
        for (let i = 0; i < galleryFiles.length; i++) {
            const file = galleryFiles[i];
            try {
                if (typeof file === 'string') {
                    const sanitizedGalleryPath = sanitizeBusinessMediaPath(file);
                    if (sanitizedGalleryPath) {
                        galleryUrls.push(sanitizedGalleryPath);
                    }
                } else {
                    const galleryBuffer = await file.arrayBuffer();
                    const fileExt = file.name.split('.').pop() || 'png';
                    // FIXED: Use timestamp + random ID to prevent collision (even for galleries)
                    const galleryPath = generateUniqueFilePath(`businesses/${businessId}/gallery-${i}`, fileExt);
                    await supabaseService.storage
                        .from('business-images')
                        .upload(galleryPath, galleryBuffer, {
                            contentType: file.type,
                            upsert: false,
                        });
                    galleryUrls.push(galleryPath);
                }
            } catch (error) {
                console.error(`Error handling gallery image ${i}:`, error);
            }
        }
        const sanitizedGalleryUrls = sanitizeBusinessGalleryUrls(galleryUrls);
        if (sanitizedGalleryUrls.length > 0) {
            businessImages.gallery_urls = sanitizedGalleryUrls;
        }
    }

    // Update business with image URLs if any were uploaded
    if (Object.keys(businessImages).length > 0) {
        const updatePayload: any = {};
        if (businessImages.logo_url) updatePayload.logo_url = businessImages.logo_url;
        if (businessImages.cover_url) updatePayload.cover_url = businessImages.cover_url;
        if (businessImages.gallery_urls) updatePayload.gallery_urls = businessImages.gallery_urls;

        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabaseService
                .from('businesses')
                .update(updatePayload)
                .eq('id', businessId);

            if (updateError) {
                console.error('Error updating business images:', updateError);
            }
        }
    }
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
        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { status: 'error', message: 'Vous devez être connecté.' };
        }

        // Verify claim exists and belongs to user
        const { data: claim } = await supabase
            .from('business_claims')
            .select('id, user_id, email, proof_methods')
            .eq('id', claimId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!claim) {
            return { status: 'error', message: 'Revendication non trouvée ou non autorisée.' };
        }

        // Verify method is valid
        if (!['email', 'phone', 'document'].includes(method)) {
            return { status: 'error', message: 'Méthode de vérification invalide.' };
        }

        // Generate new verification code (6 digits)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiration to 24 hours from now
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Delete old codes for this claim and method
        await supabase
            .from('verification_codes')
            .delete()
            .eq('claim_id', claimId)
            .eq('method', method);

        // Insert new code
        const { error: codeError } = await supabase
            .from('verification_codes')
            .insert([
                {
                    claim_id: claimId,
                    code: verificationCode,
                    method: method,
                    verified: false,
                    expires_at: expiresAt,
                },
            ]);

        if (codeError) {
            console.error('Error creating verification code:', codeError);
            return { status: 'error', message: 'Erreur lors de la création du code de vérification.' };
        }

        // Send code via email if method is email
        if (method === 'email') {
            try {
                const settings = await getSiteSettings();
                const siteName = getSiteName(settings);

                await sendEmail({
                    to: claim.email,
                    subject: emailTemplates.verificationCode.subject(verificationCode),
                    html: emailTemplates.verificationCode.html({ code: verificationCode, siteName }),
                });

                console.log(`📧 Verification email sent for ${claim.email}`);
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
                // Don't fail if email send fails - code is still created
            }
        }

        return {
            status: 'success',
            message: `Un nouveau code de vérification a été envoyé. Valide pendant 24 heures.`,
        };
    } catch (error) {
        console.error('Error resending verification code:', error);
        return {
            status: 'error',
            message: 'Une erreur est survenue. Veuillez réessayer.',
        };
    }
}

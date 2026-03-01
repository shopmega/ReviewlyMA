'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
    businessReportSchema,
    reviewReportSchema,
    mediaReportSchema,
    type ActionState,
    type BusinessReportFormData,
    type ReviewReportFormData,
    type MediaReportFormData
} from '@/lib/types';
import {
    handleValidationError,
    handleDatabaseError,
    createErrorResponse,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/errors';
import { checkRateLimit, recordAttempt, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter-enhanced';

/**
 * Report a business for moderation
 */
export async function reportBusiness(
    data: BusinessReportFormData
): Promise<ActionState> {
    const validatedFields = businessReportSchema.safeParse(data);

    if (!validatedFields.success) {
        return handleValidationError(
            'Données de signalement invalides.',
            validatedFields.error.flatten().fieldErrors as any
        ) as ActionState;
    }

    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Rate limiting
        const rateLimitKey = user ? `report-biz-${user.id}` : 'report-biz-anon';
        const { isLimited, retryAfterSeconds } = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.report);
        if (isLimited) {
            return createErrorResponse(
                ErrorCode.RATE_LIMIT_ERROR,
                `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
            ) as ActionState;
        }

        if (!user) {
            return createErrorResponse(
                ErrorCode.AUTHENTICATION_ERROR,
                'Vous devez être connecté pour signaler un établissement.'
            ) as ActionState;
        }

        const reportData = {
            ...validatedFields.data,
            reporter_id: user.id,
            status: 'pending',
        };

        const { error } = await supabase
            .from('business_reports')
            .insert([reportData]);

        if (error) {
            await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.report);
            logError('business_report_insert_error', error, { businessId: validatedFields.data.business_id });
            return handleDatabaseError(error) as ActionState;
        }

        return createSuccessResponse('Signalement envoyé. Nos modérateurs vont examiner cet établissement.') as ActionState;
    } catch (error) {
        logError('reportBusiness_unexpected', error);
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de l\'envoi du signalement.'
        ) as ActionState;
    }
}

/**
 * Report a review (Proxying for centralization)
 */
export async function reportReviewAction(
    data: ReviewReportFormData
): Promise<ActionState> {
    const validatedFields = reviewReportSchema.safeParse(data);

    if (!validatedFields.success) {
        return handleValidationError(
            'Données de signalement invalides.',
            validatedFields.error.flatten().fieldErrors as any
        ) as ActionState;
    }

    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Connexion requise.') as ActionState;
        }

        const { error } = await supabase
            .from('review_reports')
            .insert([{
                ...validatedFields.data,
                reporter_id: user.id,
                status: 'pending'
            }]);

        if (error) return handleDatabaseError(error) as ActionState;
        return createSuccessResponse('Signalement envoyé.') as ActionState;
    } catch (error) {
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur serveur.') as ActionState;
    }
}

/**
 * Report media (Centralization)
 */
export async function reportMediaAction(
    data: MediaReportFormData
): Promise<ActionState> {
    const validatedFields = mediaReportSchema.safeParse(data);

    if (!validatedFields.success) {
        return handleValidationError(
            'Données invalides.',
            validatedFields.error.flatten().fieldErrors as any
        ) as ActionState;
    }

    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Connexion requise.') as ActionState;

        const { error } = await supabase
            .from('media_reports')
            .insert([{
                ...validatedFields.data,
                reporter_id: user.id,
                status: 'pending'
            }]);

        if (error) return handleDatabaseError(error) as ActionState;
        return createSuccessResponse('Signalement média envoyé.') as ActionState;
    } catch (error) {
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur serveur.') as ActionState;
    }
}

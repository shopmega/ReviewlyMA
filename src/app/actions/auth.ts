'use server';

import { redirect } from 'next/navigation';
import { 
    loginSchema, 
    signupSchema, 
    proSignupSchema, 
    resetPasswordRequestSchema, 
    updatePasswordSchema,
    ActionState
} from '@/lib/types';
import { checkRateLimit, recordAttempt, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
    handleAuthenticationError,
    handleValidationError,
    handleDatabaseError,
    createErrorResponse,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/errors';

export type AuthFormState = ActionState;

export async function login(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = loginSchema.safeParse(entries);

    if (!validatedFields.success) {
        return handleValidationError(
            'Veuillez corriger les erreurs dans le formulaire.',
            validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        ) as AuthFormState;
    }

    const { email, password } = validatedFields.data;

    // Rate limiting
    const { isLimited, retryAfterSeconds } = checkRateLimit(email, RATE_LIMIT_CONFIG.login);
    if (isLimited) {
        return createErrorResponse(
            ErrorCode.RATE_LIMIT_ERROR,
            `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        ) as AuthFormState;
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            recordAttempt(email, RATE_LIMIT_CONFIG.login);
            logError('login_action', error, { email });
            return handleAuthenticationError(
                error.message || 'Identifiant ou mot de passe incorrect.'
            ) as AuthFormState;
        }

        return createSuccessResponse(
            'Connexion réussie! Redirection en cours...'
        ) as AuthFormState;
    } catch (error) {
        logError('login_action_unexpected', error, { email });
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de la connexion.'
        ) as AuthFormState;
    }
}

export async function signup(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = signupSchema.safeParse(entries);

    if (!validatedFields.success) {
        return handleValidationError(
            'Veuillez corriger les erreurs dans le formulaire.',
            validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        ) as AuthFormState;
    }

    const { email, password, fullName } = validatedFields.data;

    // Rate limiting
    const { isLimited, retryAfterSeconds } = checkRateLimit(email, RATE_LIMIT_CONFIG.signup);
    if (isLimited) {
        return createErrorResponse(
            ErrorCode.RATE_LIMIT_ERROR,
            `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        ) as AuthFormState;
    }

    try {
        const supabase = await createClient();

        // Check if new registrations are allowed
        const { data: settings } = await supabase
            .from('site_settings')
            .select('allow_new_registrations')
            .eq('id', 'main')
            .single();

        if (settings?.allow_new_registrations === false) {
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Les nouvelles inscriptions sont temporairement désactivées.'
            ) as AuthFormState;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });

        if (error) {
            recordAttempt(email, RATE_LIMIT_CONFIG.signup);
            logError('signup_action', error, { email });
            return handleDatabaseError(error) as AuthFormState;
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
            return createSuccessResponse(
                'Vérifiez votre e-mail pour confirmer votre inscription.'
            ) as AuthFormState;
        }

        return createSuccessResponse(
            'Inscription réussie! Redirection en cours...'
        ) as AuthFormState;
    } catch (error) {
        logError('signup_action_unexpected', error, { email });
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de l\'inscription.'
        ) as AuthFormState;
    }
}

export async function proSignup(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {

    const entries = Object.fromEntries(formData.entries());
        const validatedFields = proSignupSchema.safeParse(entries);

        if (!validatedFields.success) {
            return handleValidationError(
                'Veuillez corriger les erreurs dans le formulaire.',
                validatedFields.error.flatten().fieldErrors as Record<string, string[]>
            ) as AuthFormState;
        }

    const { email, password, fullName, jobTitle, businessName } = validatedFields.data;

    // Rate limiting
    const { isLimited, retryAfterSeconds } = checkRateLimit(email, RATE_LIMIT_CONFIG.signup);
    if (isLimited) {
        return createErrorResponse(
            ErrorCode.RATE_LIMIT_ERROR,
            `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        ) as AuthFormState;
    }

    try {
        // STEP 1: Create Supabase Auth user
        const supabase = await createClient();
        const supabaseService = await createServiceClient();
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    job_title: jobTitle,
                },
            },
        });

        if (authError) {
            recordAttempt(email, RATE_LIMIT_CONFIG.signup);
            logError('pro_signup_auth', authError, { email });
            return handleDatabaseError(authError) as AuthFormState;
        }

        if (!authData.user) {
            return createErrorResponse(
                ErrorCode.AUTHENTICATION_ERROR,
                'Erreur lors de la création du compte.'
            ) as AuthFormState;
        }

        // STEP 2: Call atomic stored procedure (TRANSACTIONAL)
        // This ensures business, profile, and claim are all created or all rollback
        const { data: procResult, error: procError } = await supabaseService.rpc(
            'create_pro_signup',
            {
                p_user_id: authData.user.id,
                p_email: email,
                p_full_name: fullName,
                p_job_title: jobTitle || 'Non specifie',
                p_business_name: businessName,
            }
        );

        if (procError || !procResult || procResult.length === 0) {
            logError('pro_signup_procedure', procError, { email, userId: authData.user.id });
            
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Erreur lors de la création de votre compte. Veuillez réessayer.'
            ) as AuthFormState;
        }

        const result = procResult[0];
        if (!result.success || !result.business_id || !result.claim_id) {
            logError('pro_signup_result', new Error('Invalid procedure result'), { result });
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Erreur lors de la création de votre compte. Veuillez réessayer.'
            ) as AuthFormState;
        }

        return createSuccessResponse(
            'Compte créé avec succès! Veuillez vérifier votre email et attendre l\'approbation de votre revendication.'
        ) as AuthFormState;
    } catch (error) {
        logError('pro_signup_unexpected', error, { email });
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de l\'inscription pro.'
        ) as AuthFormState;
    }
}

export async function logout(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}

/**
 * Request a password reset email
 */
export async function requestPasswordReset(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = resetPasswordRequestSchema.safeParse(entries);

    if (!validatedFields.success) {
        return handleValidationError(
            'Veuillez entrer une adresse e-mail valide.',
            validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        ) as AuthFormState;
    }

    const { email } = validatedFields.data;

    try {
        const supabase = await createClient();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://avis.ma');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/reset-password`,
        });

        if (error) {
            logError('password_reset_request', error, { email });
            // Don't reveal if user exists or not for security
            return createErrorResponse(
                ErrorCode.SERVER_ERROR,
                'Une erreur est survenue. Veuillez réessayer.'
            ) as AuthFormState;
        }

        // Always show success even if email doesn't exist (security best practice)
        return createSuccessResponse(
            'Si un compte existe avec cette adresse, vous recevrez un e-mail avec les instructions.'
        ) as AuthFormState;
    } catch (error) {
        logError('password_reset_request_unexpected', error);
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue. Veuillez réessayer.'
        ) as AuthFormState;
    }
}

/**
 * Update password after reset
 */
export async function updatePassword(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = updatePasswordSchema.safeParse(entries);

    if (!validatedFields.success) {
        return handleValidationError(
            'Veuillez entrer un mot de passe valide.',
            validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        ) as AuthFormState;
    }

    const { password } = validatedFields.data;

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            logError('update_password', error);
            return handleAuthenticationError(
                'Impossible de mettre à jour le mot de passe. Veuillez réessayer.'
            ) as AuthFormState;
        }

        return createSuccessResponse(
            'Votre mot de passe a été mis à jour avec succès.'
        ) as AuthFormState;
    } catch (error) {
        logError('update_password_unexpected', error);
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue. Veuillez réessayer.'
        ) as AuthFormState;
    }
}

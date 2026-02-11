'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
    handleAuthenticationError,
    handleDatabaseError,
    createErrorResponse,
    createSuccessResponse,
    logError,
    ErrorCode
} from '@/lib/errors';
import { ActionState, userProfileUpdateSchema } from '@/lib/types';

export async function syncProProfile(): Promise<ActionState> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { status: 'error', message: 'Non authentifié.' };
    }

    // Initialize service role client for the actual update
    const supabaseService = await createServiceClient();

    try {
        // Find an approved claim for this user
        const { data: claim, error: claimError } = await supabaseService
            .from('business_claims')
            .select('business_id')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (claimError || !claim) {
            return { status: 'error', message: 'Aucune revendication approuvée trouvée.' };
        }

        // Update the profile
        const { error: updateError } = await supabaseService
            .from('profiles')
            .update({
                business_id: claim.business_id,
                role: 'pro'
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Sync profile error:', updateError);
            return { status: 'error', message: 'Erreur lors de la synchronisation du profil.' };
        }

        return { status: 'success', message: 'Profil synchronisé avec succès.' };
    } catch (error: any) {
        console.error('Sync action error:', error);
        return { status: 'error', message: error.message || 'Une erreur est survenue.' };
    }
}

export async function toggleBookmark(businessId: string): Promise<ActionState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { status: 'error', message: 'Vous devez être connecté pour enregistrer un établissement.' };
    }

    // Check if already bookmarked
    const { data: existing } = await supabase
        .from('saved_businesses')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

    if (existing) {
        // Remove bookmark
        const { error } = await supabase
            .from('saved_businesses')
            .delete()
            .eq('id', existing.id);

        if (error) return { status: 'error', message: 'Erreur lors de la suppression.' };
        return { status: 'success', data: { isBookmarked: false }, message: 'Établissement retiré des favoris.' };
    } else {
        // Add bookmark
        const { error } = await supabase
            .from('saved_businesses')
            .insert({ user_id: user.id, business_id: businessId });

        if (error) return { status: 'error', message: 'Erreur lors de l\'enregistrement.' };
        return { status: 'success', data: { isBookmarked: true }, message: 'Établissement enregistré.' };
    }
}

export async function getIsBookmarked(businessId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
        .from('saved_businesses')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

    return !!data;
}

export async function getSavedBusinesses() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Get business IDs from both tables to ensure compatibility
    const [{ data: savedData, error: savedError }, { data: favoritesData, error: favoritesError }] = await Promise.all([
        supabase
            .from('saved_businesses')
            .select('business_id, created_at')
            .eq('user_id', user.id),
        supabase
            .from('favorites')
            .select('business_id, created_at')
            .eq('user_id', user.id)
    ]);

    if (savedError || favoritesError) {
        console.error('Error fetching saved/favorites:', savedError || favoritesError);
        throw new Error('Failed to fetch saved businesses');
    }

    // Combine and deduplicate
    const combinedData = [...(savedData || []), ...(favoritesData || [])];
    if (combinedData.length === 0) {
        return [];
    }

    // Map to business IDs and track the latest save date for sorting
    const businessMap = new Map<string, string>();
    combinedData.forEach(item => {
        const existingDate = businessMap.get(item.business_id);
        if (!existingDate || new Date(item.created_at) > new Date(existingDate)) {
            businessMap.set(item.business_id, item.created_at);
        }
    });

    const businessIds = Array.from(businessMap.keys());

    // Now fetch the actual business data
    const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds);

    if (businessesError) {
        console.error('Error fetching businesses:', businessesError);
        throw new Error('Failed to fetch business data');
    }

    // Combine saved data with business data and ensure proper structure
    return businesses.map(business => {
        // Ensure logo has proper structure for BusinessCard component
        const logo = {
            imageUrl: business.logo_url || '/placeholders/logo-placeholder.svg',
            imageHint: business.logo_hint || 'logo placeholder',
        };

        // Ensure photos array has proper structure for BusinessCard component
        const photos = business.photos || [];

        // Ensure reviews array has proper structure for BusinessCard component
        const reviews = business.reviews || [];

        // Ensure overallRating has proper structure for BusinessCard component
        const overallRating = typeof business.overall_rating === 'number' ? business.overall_rating : 0;

        return {
            ...business,
            logo,
            photos,
            reviews,
            overallRating,
            saved_at: businessMap.get(business.id)
        };
    });
}



export async function updateUserProfile(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { status: 'error', message: 'Non authentifié.' };
    }

    // Validate the form data
    const emailPrefsRaw = formData.get('email_preferences');
    const rawFormData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        email_preferences: emailPrefsRaw ? JSON.parse(String(emailPrefsRaw)) : undefined,
    };

    const validatedFields = userProfileUpdateSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Validation échouée',
            errors: validatedFields.error.flatten().fieldErrors as any,
        };
    }

    try {
        // Update the user profile
        const updateData: any = {
            full_name: validatedFields.data.full_name,
            email: validatedFields.data.email,
        };

        if (validatedFields.data.email_preferences) {
            updateData.email_preferences = validatedFields.data.email_preferences;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);

        if (error) {
            console.error('Update profile error:', error);
            return { status: 'error', message: 'Erreur lors de la mise à jour du profil.' };
        }

        return { status: 'success', message: 'Profil mis à jour avec succès.' };
    } catch (error: any) {
        console.error('Update profile exception:', error);
        return { status: 'error', message: 'Une erreur est survenue lors de la mise à jour du profil.' };
    }
}

/**
 * Export all user data as JSON
 */
export async function exportUserData(): Promise<ActionState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Non authentifié.');

    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: reviews } = await supabase.from('reviews').select('*').eq('user_id', user.id);
        const { data: favorites } = await supabase.from('saved_businesses').select('*, businesses(name)').eq('user_id', user.id);

        const exportData = {
            profile,
            reviews,
            favorites,
            export_date: new Date().toISOString(),
        };

        return createSuccessResponse('Données préparées avec succès.', exportData);
    } catch (error) {
        logError('export_user_data_error', error);
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur lors de l\'exportation.');
    }
}

/**
 * Request account deletion (scheduled)
 */
export async function requestAccountDeletion(): Promise<ActionState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Non authentifié.');

    try {
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30); // 30 days delay

        const { error } = await supabase
            .from('profiles')
            .update({
                deletion_scheduled_at: deletionDate.toISOString()
            })
            .eq('id', user.id);

        if (error) throw error;

        return createSuccessResponse(
            `Votre demande de suppression a été enregistrée. Votre compte sera supprimé le ${deletionDate.toLocaleDateString('fr-FR')}. Vous pouvez annuler cette demande à tout moment en vous reconnectant.`
        );
    } catch (error) {
        logError('request_deletion_error', error);
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur lors de la demande de suppression.');
    }
}


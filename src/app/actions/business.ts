'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ActionState, businessProfileUpdateSchema } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/server';
import { logger, LogLevel } from '@/lib/logger';

export async function suggestBusiness(formData: FormData): Promise<ActionState> {
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

    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const city = formData.get('city') as string;
    const description = formData.get('description') as string;
    const location = formData.get('address') as string; // Form field is 'address' but DB column is 'location'

    if (!name || !category || !city) {
        return { status: 'error', message: 'Veuillez remplir les champs obligatoires.' };
    }

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { status: 'error', message: 'Vous devez être connecté pour suggérer une entreprise.' };
    }

    try {
        // Insert into business_suggestions table instead of directly creating businesses
        const { error } = await supabase
            .from('business_suggestions')
            .insert({
                name,
                category,
                city,
                description: description || '',
                location: location || '',
                suggested_by: user.id
            });

        if (error) {
            console.error('Error creating business suggestion:', error);
            return { status: 'error', message: 'Erreur lors de la suggestion de l\'établissement.' };
        }

        return {
            status: 'success',
            message: 'Établissement suggéré avec succès ! Notre équipe examinera votre suggestion.'
        };
    } catch (error) {
        console.error('Server error proposing business:', error);
        return { status: 'error', message: 'Une erreur inattendue est survenue.' };
    }
}

import { MediaReportFormData } from '@/lib/types';

/**
 * Helper to verify if a user has permission to manage a specific business
 */
async function verifyBusinessOwnership(supabase: any, userId: string, businessId: string) {
    // 1. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, business_id')
        .eq('id', userId)
        .single();

    if (!profile) return { authorized: false, profile: null };

    // 2. Check if user is admin
    if (profile.role === 'admin') return { authorized: true, profile };

    // 3. Check if it's their primary business
    if (profile.business_id === businessId) return { authorized: true, profile };

    // 4. Check for approved business claims
    const { data: claim } = await supabase
        .from('business_claims')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .eq('status', 'approved')
        .maybeSingle();

    if (claim) return { authorized: true, profile };

    return { authorized: false, profile };
}

export async function reportMedia(data: MediaReportFormData): Promise<ActionState> {
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

    try {
        const { error } = await supabase
            .from('media_reports')
            .insert({
                media_url: data.media_url,
                media_type: data.media_type,
                business_id: data.business_id,
                reason: data.reason,
                details: data.details,
                status: 'pending'
            });

        if (error) {
            console.error('Error reporting media:', error);
            return { status: 'error', message: 'Erreur lors du signalement.' };
        }

        return { status: 'success', message: 'Signalement envoyé avec succès.' };
    } catch (error) {
        console.error('Server error reporting media:', error);
        return { status: 'error', message: 'Une erreur inattendue est survenue.' };
    }
}

export type BusinessActionState = ActionState;

export async function submitUpdate(
    prevState: BusinessActionState,
    formData: FormData
): Promise<BusinessActionState> {
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

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { status: 'error', message: 'Non autorisé' };

        const businessId = formData.get('businessId') as string;
        if (!businessId) return { status: 'error', message: 'ID de l\'établissement manquant.' };

        // Verify user has permission to update this business
        const { authorized, profile } = await verifyBusinessOwnership(supabase, user.id, businessId);

        if (!authorized || !profile || (profile.role !== 'pro' && profile.role !== 'growth' && profile.role !== 'admin')) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        const title = formData.get('updateTitle') as string;
        const content = formData.get('updateText') as string;

        if (!title || !content) {
            return { status: 'error', message: 'Champs requis manquants.' };
        }

        // INSERT UPDATE
        const { error: insertError } = await supabase
            .from('updates')
            .insert({
                business_id: businessId,
                title,
                content,
                date: new Date().toISOString().split('T')[0]
            });

        if (insertError) {
            console.error('Update create error:', insertError);
            return { status: 'error', message: 'Erreur lors de la publication.' };
        }

        // NOTIFY FOLLOWERS
        // 1. Get business name
        const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).single();

        // 2. Get followers
        const { data: followers } = await supabase
            .from('favorites')
            .select('user_id')
            .eq('business_id', businessId);

        if (followers && followers.length > 0) {
            const notifications = followers.map(f => ({
                user_id: f.user_id,
                title: `📢 Nouvelle annonce de ${business?.name || 'un établissement'}`,
                message: title,
                type: 'business_update',
                link: `/businesses/${businessId}?tab=updates`,
                is_read: false
            }));

            const serviceClient = await createServiceClient();
            await serviceClient.from('notifications').insert(notifications);
        }

        revalidatePath(`/dashboard/updates`);
        revalidatePath(`/businesses/${businessId}`);

        return { status: 'success', message: 'Nouveauté publiée et abonnés notifiés !' };

    } catch (err) {
        console.error(err);
        return { status: 'error', message: 'Erreur interne.' };
    }
}

export async function updateBusinessProfile(
    prevState: BusinessActionState,
    formData: FormData
): Promise<BusinessActionState> {
    logger.server(LogLevel.DEBUG, '[SERVER] updateBusinessProfile called');

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

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            logger.server(LogLevel.WARN, '[SERVER] No user found - unauthorized');
            return { status: 'error', message: 'Non autorisé' };
        }
        logger.server(LogLevel.INFO, '[SERVER] User authenticated', { userId: user.id });

        // CRITICAL FIX: Get the business ID from the form data (the business being edited)
        const businessIdToUpdate = formData.get('businessId') as string;
        logger.server(LogLevel.DEBUG, '[DEBUG] Business ID from form', { businessId: businessIdToUpdate });

        if (!businessIdToUpdate) {
            logger.server(LogLevel.WARN, '[SERVER] No business ID provided in form data');
            return { status: 'error', message: 'ID de l\'établissement manquant' };
        }

        // Verify user has permission to update this business
        const { authorized, profile } = await verifyBusinessOwnership(supabase, user.id, businessIdToUpdate);

        if (!authorized || !profile) {
            logger.server(LogLevel.WARN, '[SERVER] User does not have permission for this business');
            return { status: 'error', message: 'Vous n\'avez pas la permission de modifier cet établissement' };
        }

        logger.server(LogLevel.DEBUG, '[DEBUG] User profile details', { businessId: profile.business_id, role: profile.role });

        // Check if user has pro/growth role or is admin
        if (profile.role !== 'pro' && profile.role !== 'growth' && profile.role !== 'admin') {
            logger.server(LogLevel.WARN, '[SERVER] User does not have required role', { role: profile.role });
            return { status: 'error', message: 'Accès réservé aux comptes professionnels' };
        }

        logger.server(LogLevel.INFO, '[SERVER] User has permission to edit this business');

        // 1. Extract and Validate data using the schema
        const rawData: any = {};
        for (const [key, value] of formData.entries()) {
            if (value !== null && value !== '') {
                if (key === 'amenities') {
                    // Split by comma and clean up whitespace
                    const amenitiesStr = value.toString();
                    logger.server(LogLevel.DEBUG, '[DEBUG] Amenities received from form', { amenitiesStr });
                    if (amenitiesStr) {
                        rawData[key] = amenitiesStr.split(',').map(s => s.trim()).filter(Boolean);
                        logger.server(LogLevel.DEBUG, '[DEBUG] Amenities parsed as array', { amenities: rawData[key] });
                    } else {
                        rawData[key] = [];
                    }
                } else {
                    rawData[key] = value;
                }
            } else if (key === 'amenities' && value === '') {
                // Handle empty amenities explicitely to clear them
                rawData[key] = [];
                logger.server(LogLevel.DEBUG, '[DEBUG] Amenities cleared (empty value)');
            }
        }

        logger.server(LogLevel.DEBUG, '[DEBUG] Raw data before validation', { rawData });

        const validatedFields = businessProfileUpdateSchema.safeParse(rawData);

        if (!validatedFields.success) {
            console.error('❌ [DEBUG] Validation failed:', validatedFields.error.flatten().fieldErrors);
            return {
                status: 'error',
                message: 'Veuillez corriger les erreurs dans le formulaire.',
                errors: validatedFields.error.flatten().fieldErrors as any
            };
        }

        // Use filtered data from schema validation to prevent unauthorized field updates (like is_premium)
        const updateData = validatedFields.data;
        logger.server(LogLevel.DEBUG, '[DEBUG] Business update details', { businessId: businessIdToUpdate, updateData });

        // CRITICAL FIX: Use service client to bypass RLS policies
        const supabaseService = await createServiceClient();

        // Update the business record using service client
        const { error, data: updatedBusiness } = await supabaseService
            .from('businesses')
            .update(updateData)
            .eq('id', businessIdToUpdate) // Use the business ID from form, not profile
            .select('id, amenities');

        if (error) {
            console.error('❌ [DEBUG] Database update error:', error);
            console.error('Error updating business profile:', error);
            return { status: 'error', message: 'Erreur lors de la mise à jour du profil' };
        }

        logger.server(LogLevel.INFO, '[DEBUG] Business updated successfully', { updatedBusiness, amenities: updateData.amenities });

        revalidatePath(`/dashboard/edit-profile`);
        revalidatePath(`/businesses/${businessIdToUpdate}`);
        revalidatePath(`/dashboard`);

        return { status: 'success', message: 'Profil mis à jour avec succès' };
    } catch (err) {
        console.error('Server error updating business profile:', err);
        return { status: 'error', message: 'Erreur serveur lors de la mise à jour du profil' };
    }
}

export async function updateBusinessImagesAction(businessId: string, imageData: { logo_url?: string | null; cover_url?: string | null; gallery_urls?: string[] }): Promise<BusinessActionState> {
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

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { status: 'error', message: 'Non autorisé' };

        // Verify user has permission to update this business
        const { authorized, profile } = await verifyBusinessOwnership(supabase, user.id, businessId);

        if (!authorized || !profile || (profile.role !== 'pro' && profile.role !== 'growth' && profile.role !== 'admin')) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        // Prepare update data
        const updateData: any = {};

        if ('logo_url' in imageData) {
            updateData.logo_url = imageData.logo_url;
        }
        if ('cover_url' in imageData) {
            updateData.cover_url = imageData.cover_url;
        }
        if ('gallery_urls' in imageData) {
            updateData.gallery_urls = imageData.gallery_urls;
        }

        // Update the business images
        const { error } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId);

        if (error) {
            console.error('Error updating business images:', error);
            return { status: 'error', message: 'Erreur lors de la mise à jour des images' };
        }

        revalidatePath(`/dashboard/edit-profile`);
        revalidatePath(`/businesses/${businessId}`);

        return { status: 'success', message: 'Images mises à jour avec succès' };
    } catch (err) {
        console.error('Server error updating business images:', err);
        return { status: 'error', message: 'Erreur serveur lors de la mise à jour des images' };
    }
}

export async function saveBusinessHours(hours: any[], businessId: string): Promise<BusinessActionState> {
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

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { status: 'error', message: 'Non autorisé' };

        // Verify user has permission to update this business
        const { authorized, profile } = await verifyBusinessOwnership(supabase, user.id, businessId);

        if (!authorized || !profile || (profile.role !== 'pro' && profile.role !== 'growth' && profile.role !== 'admin')) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        // Use RPC for atomic operation to replace business hours
        const { error } = await supabase.rpc('replace_business_hours', {
            p_business_id: businessId,
            p_hours: hours
        });

        if (error) {
            console.error('Error saving business hours:', error);
            return { status: 'error', message: 'Erreur lors de l\'enregistrement des heures' };
        }

        revalidatePath(`/dashboard/edit-profile`);
        revalidatePath(`/businesses/${businessId}`);

        return { status: 'success', message: 'Horaires enregistrés avec succès' };
    } catch (err) {
        console.error('Server error saving business hours:', err);
        return { status: 'error', message: 'Erreur serveur lors de l\'enregistrement des heures' };
    }
}

export async function getBusinessHours(businessId: string): Promise<any[]> {
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

    try {
        const { data, error } = await supabase
            .from('business_hours')
            .select('*')
            .eq('business_id', businessId);

        if (error) {
            console.error('Error fetching business hours:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Server error fetching business hours:', err);
        return [];
    }
}

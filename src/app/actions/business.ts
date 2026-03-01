'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ActionState, businessProfileUpdateSchema, mediaReportSchema, MediaReportFormData, type SubscriptionTier } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/server';
import { logger, LogLevel } from '@/lib/logger';
import { notifyAdmins } from '@/lib/notifications';
import { isPaidTier } from '@/lib/tier-utils';
import { sanitizeBusinessGalleryUrls, sanitizeBusinessMediaPath } from '@/lib/business-media';

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

/**
 * Helper to verify if a user has permission to manage a specific business
 */
async function verifyBusinessOwnership(supabase: any, userId: string, businessId: string) {
    // 1. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, business_id, tier')
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
        .or('claim_state.eq.verified,status.eq.approved')
        .maybeSingle();

    if (claim) return { authorized: true, profile };

    // 5. Check explicit business assignments
    const { data: assignment } = await supabase
        .from('user_businesses')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .maybeSingle();

    if (assignment) return { authorized: true, profile };

    return { authorized: false, profile };
}

function parseStringArrayField(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    if (typeof raw !== 'string') {
        return [];
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return [];
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter(Boolean);
        }
    } catch {
        // Keep backward compatibility with comma-separated strings.
    }

    return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

type BusinessFollowerNotificationInput = {
    businessId: string;
    title: string;
    message: string;
    type: string;
    link: string;
    actorUserId?: string;
    dedupeMinutes?: number;
};

async function notifyBusinessFollowers(input: BusinessFollowerNotificationInput): Promise<void> {
    try {
        const serviceClient = await createServiceClient();

        const { data: followers, error: followersError } = await serviceClient
            .from('favorites')
            .select('user_id')
            .eq('business_id', input.businessId);

        if (followersError) {
            console.error('Error fetching followers for notification:', followersError);
            return;
        }

        const uniqueRecipientIds = Array.from(
            new Set(
                (followers ?? [])
                    .map((row: { user_id: string | null }) => row.user_id)
                    .filter((userId): userId is string => Boolean(userId) && userId !== input.actorUserId)
            )
        );

        if (uniqueRecipientIds.length === 0) {
            return;
        }

        let finalRecipientIds = uniqueRecipientIds;
        const dedupeMinutes = input.dedupeMinutes ?? 0;
        if (dedupeMinutes > 0) {
            const dedupeSince = new Date(Date.now() - dedupeMinutes * 60 * 1000).toISOString();
            const { data: recentNotifications, error: recentError } = await serviceClient
                .from('notifications')
                .select('user_id')
                .in('user_id', uniqueRecipientIds)
                .eq('type', input.type)
                .eq('link', input.link)
                .gte('created_at', dedupeSince);

            if (recentError) {
                console.error('Error checking recent notifications:', recentError);
            } else if (recentNotifications && recentNotifications.length > 0) {
                const recentlyNotifiedIds = new Set(
                    recentNotifications
                        .map((row: { user_id: string | null }) => row.user_id)
                        .filter((userId): userId is string => Boolean(userId))
                );

                finalRecipientIds = uniqueRecipientIds.filter((userId) => !recentlyNotifiedIds.has(userId));
            }
        }

        if (finalRecipientIds.length === 0) {
            return;
        }

        const notifications = finalRecipientIds.map((userId) => ({
            user_id: userId,
            title: input.title,
            message: input.message,
            type: input.type,
            link: input.link,
            is_read: false,
        }));

        const { error: insertError } = await serviceClient
            .from('notifications')
            .insert(notifications);

        if (insertError) {
            console.error('Error inserting follower notifications:', insertError);
        }
    } catch (error) {
        console.error('Unexpected error while notifying followers:', error);
    }
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
        const validated = mediaReportSchema.safeParse(data);
        if (!validated.success) {
            return { status: 'error', message: 'Donnees de signalement invalides.' };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { status: 'error', message: 'Vous devez etre connecte pour signaler un media.' };
        }

        const { error } = await supabase
            .from('media_reports')
            .insert({
                media_url: validated.data.media_url,
                media_type: validated.data.media_type,
                business_id: validated.data.business_id,
                reporter_id: user.id,
                reason: validated.data.reason,
                details: validated.data.details,
                status: 'pending'
            });

        if (error) {
            console.error('Error reporting media:', error);
            return { status: 'error', message: 'Erreur lors du signalement.' };
        }

        await notifyAdmins({
            title: 'Nouveau signalement media',
            message: 'Un media a ete signale et attend moderation.',
            type: 'admin_media_report_pending',
            link: '/admin/medias',
        });

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

        if (!authorized || !profile) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        const isAdmin = profile.role === 'admin';
        let hasPremiumAccess = isPaidTier((profile.tier ?? null) as SubscriptionTier | null);

        if (!isAdmin && !hasPremiumAccess) {
            const { data: businessTier } = await supabase
                .from('businesses')
                .select('tier')
                .eq('id', businessId)
                .maybeSingle();

            hasPremiumAccess = isPaidTier((businessTier?.tier ?? null) as SubscriptionTier | null);
        }

        if (!isAdmin && !hasPremiumAccess) {
            return { status: 'error', message: 'Fonctionnalite reservee aux comptes Premium.' };
        }

        const title = formData.get('updateTitle') as string;
        const content = formData.get('updateText') as string;
        const isPinned = formData.get('isPinned') === 'on';

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
                date: new Date().toISOString().split('T')[0],
                is_pinned: isPinned,
                pinned_at: isPinned ? new Date().toISOString() : null,
            });

        if (insertError) {
            console.error('Update create error:', insertError);
            return { status: 'error', message: 'Erreur lors de la publication.' };
        }

        // NOTIFY FOLLOWERS
        const { data: business } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', businessId)
            .single();

        await notifyBusinessFollowers({
            businessId,
            actorUserId: user.id,
            title: `Nouvelle annonce de ${business?.name || 'un etablissement'}`,
            message: title,
            type: 'business_update',
            link: `/businesses/${businessId}?tab=updates`,
        });


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
        logger.server(LogLevel.INFO, '[SERVER] User has permission to edit this business');

        // 1. Extract and Validate data using the schema
        const rawData: any = {};
        for (const [key, value] of formData.entries()) {
            if (value !== null && value !== '') {
                if (key === 'amenities' || key === 'tags') {
                    const parsedArray = parseStringArrayField(value);
                    rawData[key] = parsedArray;
                    logger.server(LogLevel.DEBUG, `[DEBUG] ${key} parsed as array`, { [key]: parsedArray });
                } else {
                    rawData[key] = value;
                }
            } else if ((key === 'amenities' || key === 'tags') && value === '') {
                // Allow clearing these array fields explicitly.
                rawData[key] = [];
                logger.server(LogLevel.DEBUG, `[DEBUG] ${key} cleared (empty value)`);
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

        if (!updatedBusiness || updatedBusiness.length === 0) {
            logger.server(LogLevel.WARN, '[SERVER] Business update matched no rows', { businessId: businessIdToUpdate });

            // Fallback: resolve a canonical business id from user's managed businesses
            // to handle stale profile.business_id values.
            const candidateIds = new Set<string>();
            if (profile.business_id) candidateIds.add(profile.business_id);

            const [{ data: approvedClaims }, { data: assignments }] = await Promise.all([
                supabaseService
                    .from('business_claims')
                    .select('business_id')
                    .eq('user_id', user.id)
                    .or('claim_state.eq.verified,status.eq.approved'),
                supabaseService
                    .from('user_businesses')
                    .select('business_id')
                    .eq('user_id', user.id),
            ]);

            approvedClaims?.forEach((item: { business_id: string | null }) => {
                if (item.business_id) candidateIds.add(item.business_id);
            });
            assignments?.forEach((item: { business_id: string | null }) => {
                if (item.business_id) candidateIds.add(item.business_id);
            });

            const fallbackCandidates = Array.from(candidateIds).filter((id) => id !== businessIdToUpdate);

            if (fallbackCandidates.length > 0) {
                const { data: existingBusinesses } = await supabaseService
                    .from('businesses')
                    .select('id')
                    .in('id', fallbackCandidates);

                const fallbackBusinessId = existingBusinesses?.[0]?.id;

                if (fallbackBusinessId) {
                    const { error: fallbackError, data: fallbackUpdated } = await supabaseService
                        .from('businesses')
                        .update(updateData)
                        .eq('id', fallbackBusinessId)
                        .select('id, amenities');

                    if (!fallbackError && fallbackUpdated && fallbackUpdated.length > 0) {
                        logger.server(LogLevel.INFO, '[SERVER] Business updated using fallback business id', {
                            requestedBusinessId: businessIdToUpdate,
                            fallbackBusinessId,
                        });

                        await notifyBusinessFollowers({
                            businessId: fallbackBusinessId,
                            actorUserId: user.id,
                            title: 'Page entreprise mise a jour',
                            message: 'Informations de la page mises a jour.',
                            type: 'business_profile_update',
                            link: `/businesses/${fallbackBusinessId}`,
                            dedupeMinutes: 15,
                        });

                        revalidatePath(`/dashboard/edit-profile`);
                        revalidatePath(`/businesses/${fallbackBusinessId}`);
                        revalidatePath(`/dashboard`);

                        return {
                            status: 'success',
                            message: 'Profil mis a jour avec succes (identifiant corrige automatiquement).',
                        };
                    }
                }
            }

            return { status: 'error', message: 'Aucun etablissement mis a jour. Verifiez l\'identifiant de la page.' };
        }

        logger.server(LogLevel.INFO, '[DEBUG] Business updated successfully', { updatedBusiness, amenities: updateData.amenities });

        const updatedFields = Object.keys(updateData as Record<string, unknown>).filter((key) => key !== 'businessId');
        const fieldPreview = updatedFields.slice(0, 3).join(', ');
        const hasMoreFields = updatedFields.length > 3;

        await notifyBusinessFollowers({
            businessId: businessIdToUpdate,
            actorUserId: user.id,
            title: 'Page entreprise mise a jour',
            message: updatedFields.length > 0
                ? `Informations modifiees: ${fieldPreview}${hasMoreFields ? ', ...' : ''}.`
                : 'Informations de la page mises a jour.',
            type: 'business_profile_update',
            link: `/businesses/${businessIdToUpdate}`,
            dedupeMinutes: 15,
        });

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

        if (!authorized || !profile) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        // Prepare update data
        const updateData: any = {};

        if ('logo_url' in imageData) {
            updateData.logo_url = sanitizeBusinessMediaPath(imageData.logo_url);
        }
        if ('cover_url' in imageData) {
            updateData.cover_url = sanitizeBusinessMediaPath(imageData.cover_url);
        }
        if ('gallery_urls' in imageData) {
            updateData.gallery_urls = sanitizeBusinessGalleryUrls(imageData.gallery_urls);
        }

        const supabaseService = await createServiceClient();

        // Update the business images with service role after ownership verification.
        const { error } = await supabaseService
            .from('businesses')
            .update(updateData)
            .eq('id', businessId);

        if (error) {
            console.error('Error updating business images:', error);
            return { status: 'error', message: 'Erreur lors de la mise à jour des images' };
        }

        await notifyBusinessFollowers({
            businessId,
            actorUserId: user.id,
            title: 'Media de la page mis a jour',
            message: 'Le logo, la couverture ou la galerie de cette page a ete mise a jour.',
            type: 'business_profile_update',
            link: `/businesses/${businessId}`,
            dedupeMinutes: 15,
        });

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

        if (!authorized || !profile) {
            return { status: 'error', message: 'Permissions insuffisantes' };
        }

        const supabaseService = await createServiceClient();

        // Use RPC for atomic operation to replace business hours.
        const { error } = await supabaseService.rpc('replace_business_hours', {
            p_business_id: businessId,
            p_hours: hours
        });

        if (error) {
            console.error('Error saving business hours:', error);
            return { status: 'error', message: 'Erreur lors de l\'enregistrement des heures' };
        }

        await notifyBusinessFollowers({
            businessId,
            actorUserId: user.id,
            title: 'Horaires mis a jour',
            message: 'Les horaires de cette page ont ete modifies.',
            type: 'business_profile_update',
            link: `/businesses/${businessId}`,
            dedupeMinutes: 15,
        });

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


'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ActionState, CollectionLink, SeasonalCollectionFormData, seasonalCollectionSchema } from '@/lib/types';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';

export type CollectionFormState = ActionState;

function buildCollectionLinkConfig(
    data: Pick<SeasonalCollectionFormData, 'linkType' | 'linkTag' | 'linkCategory' | 'linkCity' | 'linkAmenities' | 'linkHref'>
): CollectionLink {
    const cityValue = data.linkCity && data.linkCity !== 'null_city' ? data.linkCity : undefined;
    const categoryValue = data.linkCategory && data.linkCategory !== 'null_category' ? data.linkCategory : undefined;

    switch (data.linkType) {
        case 'filter': {
            const amenitiesArray = data.linkAmenities
                ? data.linkAmenities.split(',').map(a => a.trim()).filter(Boolean)
                : [];
            return {
                type: 'filter',
                tag: data.linkTag || '',
                category: categoryValue,
                city: cityValue,
                amenities: amenitiesArray.length > 0 ? amenitiesArray : undefined
            };
        }
        case 'category':
            return { type: 'category', category: categoryValue || '', city: cityValue };
        case 'city':
            return { type: 'city', city: cityValue || '' };
        case 'custom':
            return { type: 'custom', href: data.linkHref || '' };
        default:
            return { type: 'filter', tag: '' };
    }
}

async function getSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
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
}

export async function addSeasonalCollection(
    prevState: CollectionFormState,
    formData: FormData
): Promise<CollectionFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = seasonalCollectionSchema.safeParse(entries);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Veuillez corriger les erreurs dans le formulaire.',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }

    const { title, subtitle, imageUrl, imageHint, linkType, linkTag, linkCategory, linkCity, linkAmenities, linkHref } = validatedFields.data;
    const supabase = await getSupabaseClient();
    const linkConfig = buildCollectionLinkConfig({ linkType, linkTag, linkCategory, linkCity, linkAmenities, linkHref });

    const { error } = await supabase.from('seasonal_collections').insert({
        title,
        subtitle,
        image_url: imageUrl,
        image_hint: imageHint,
        link_config: linkConfig,
        active: true,
    });

    if (error) {
        console.error('Error adding collection:', error);
        return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    revalidateTag(CACHE_TAGS.COLLECTIONS);
    return { status: 'success', message: 'Collection ajoutée avec succès.' };
}

export async function deleteSeasonalCollection(id: string): Promise<CollectionFormState> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase.from('seasonal_collections').delete().eq('id', id);

    if (error) {
        console.error('Error deleting collection:', error);
        return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    revalidateTag(CACHE_TAGS.COLLECTIONS);
    return { status: 'success', message: 'Collection supprimée.' };
}

export async function toggleCollectionActive(id: string, active: boolean): Promise<CollectionFormState> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase.from('seasonal_collections').update({ active }).eq('id', id);

    if (error) {
        console.error('Error toggling collection:', error);
        return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    revalidateTag(CACHE_TAGS.COLLECTIONS);
    return { status: 'success', message: active ? 'Collection activée.' : 'Collection désactivée.' };
}

export async function updateSeasonalCollection(
    id: string,
    formData: FormData
): Promise<CollectionFormState> {
    const entries = Object.fromEntries(formData.entries());
    const validatedFields = seasonalCollectionSchema.safeParse(entries);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Veuillez corriger les erreurs dans le formulaire.',
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }

    const { title, subtitle, imageUrl, imageHint, linkType, linkTag, linkCategory, linkCity, linkAmenities, linkHref } = validatedFields.data;
    const supabase = await getSupabaseClient();
    const linkConfig = buildCollectionLinkConfig({ linkType, linkTag, linkCategory, linkCity, linkAmenities, linkHref });

    const { error } = await supabase
        .from('seasonal_collections')
        .update({
            title,
            subtitle,
            image_url: imageUrl,
            image_hint: imageHint,
            link_config: linkConfig,
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating collection:', error);
        return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    revalidateTag(CACHE_TAGS.COLLECTIONS);
    return { status: 'success', message: 'Collection modifiée avec succès.' };
}

export async function getCollectionSuggestions() {
    const supabase = await getSupabaseClient();

    // Fetch categories from the specialized table if it exists, or from businesses
    const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true);

    const categories = new Set<string>();
    if (!categoriesError && categoriesData && categoriesData.length > 0) {
        categoriesData.forEach((c: { name: string }) => {
            if (c.name) categories.add(c.name);
        });
    }

    const amenities = new Set<string>();
    const tags = new Set<string>();
    const cities = new Set<string>();

    // Fetch amenities from dedicated table if available
    const { data: amenitiesData, error: amenitiesError } = await supabase
        .from('amenities')
        .select('name')
        .eq('is_active', true);

    if (!amenitiesError && amenitiesData && amenitiesData.length > 0) {
        amenitiesData.forEach((a: { name: string }) => amenities.add(a.name));
    }

    // Fetch tags/amenities/cities from businesses as fallback
    const { data: businessesData } = await supabase.from('businesses').select('tags, amenities, benefits, city, category');

    businessesData?.forEach(b => {
        (b.tags || []).forEach((t: string) => tags.add(t));
        (b.amenities || b.benefits || []).forEach((amenity: string) => amenities.add(amenity));
        if (b.city) cities.add(b.city);
        if (b.category) categories.add(b.category);
    });

    return {
        categories: Array.from(categories).sort(),
        tags: Array.from(tags).sort(),
        amenities: Array.from(amenities).sort(),
        cities: Array.from(cities).sort()
    };
}

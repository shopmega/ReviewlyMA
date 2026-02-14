'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/supabase/admin';
import { SubscriptionTier } from '@/lib/types';
import { normalizeDisplayText } from '@/lib/text-normalize';

export type ImportResult = {
    success: boolean;
    count: number;
    errors: string[];
};

export type CSVBusinessData = {
    name: string;
    slug?: string;
    category: string;
    subcategory?: string;
    city: string;
    location?: string; // Address
    description?: string;
    phone?: string;
    website?: string;
    email?: string; // We might not have a column for this, so we'll be careful
    is_premium?: string; // "true", "false", "1", "0"
    tags?: string; // comma separated
    tier?: string; // "none", "growth", "gold" (legacy "pro" is mapped to "gold")
};

function canonicalKey(value?: string | null): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Normalize to separate accents
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
}

export async function bulkImportBusinesses(data: CSVBusinessData[]): Promise<ImportResult> {
    const supabase = await createServiceClient();

    // Verify admin
    try {
        await verifyAdminSession();
    } catch {
        return { success: false, count: 0, errors: ['Accès non autorisé'] };
    }

    if (!data || data.length === 0) {
        return { success: false, count: 0, errors: ['Aucune donnée fournie'] };
    }

    const errors: string[] = [];
    let successCount = 0;

    // Build canonical category/subcategory maps from DB to keep imports aligned
    const [{ data: dbCategories }, { data: dbSubcategories }] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('name, category_id'),
    ]);

    const categoryNameByKey = new Map<string, string>();
    const categoryNameById = new Map<string, string>();
    (dbCategories || []).forEach((c: any) => {
        const key = canonicalKey(c.name);
        if (key) categoryNameByKey.set(key, c.name);
        categoryNameById.set(c.id, c.name);
    });

    const subcategoryNameByKey = new Map<string, string>();
    (dbSubcategories || []).forEach((s: any) => {
        const categoryName = categoryNameById.get(s.category_id);
        if (!categoryName) return;
        const key = `${canonicalKey(categoryName)}::${canonicalKey(s.name)}`;
        subcategoryNameByKey.set(key, s.name);
    });

    for (const row of data) {
        const normalizedName = normalizeDisplayText(row.name);
        const normalizedCategory = normalizeDisplayText(row.category);
        const normalizedSubcategory = normalizeDisplayText(row.subcategory);
        const normalizedCity = normalizeDisplayText(row.city);
        const normalizedLocation = normalizeDisplayText(row.location);
        const normalizedDescription = normalizeDisplayText(row.description);

        if (!normalizedName || !normalizedCategory || !normalizedCity) {
            errors.push(`Ligne ignorée: Données manquantes pour "${row.name || 'Inconnu'}" (Requis: Nom, Catégorie, Ville)`);
            continue;
        }

        try {
            const mappedCategory = categoryNameByKey.get(canonicalKey(normalizedCategory)) || normalizedCategory;
            const subKey = `${canonicalKey(mappedCategory)}::${canonicalKey(normalizedSubcategory)}`;
            const mappedSubcategory = normalizedSubcategory
                ? (subcategoryNameByKey.get(subKey) || normalizedSubcategory)
                : null;

            // Deterministic business ID for idempotent imports.
            // Re-importing the same row updates existing data instead of duplicating.
            const baseSlug = row.slug?.trim()
                ? slugify(row.slug)
                : slugify(`${normalizedName}-${normalizedCity}`);
            const businessId = baseSlug;

            const isPremium = row.is_premium?.toString().toLowerCase().trim() === 'true' ||
                row.is_premium?.toString().trim() === '1' ||
                row.is_premium?.toString().toLowerCase().trim() === 'yes';

            let tier: SubscriptionTier = 'none';
            const rawTier = row.tier?.toString().toLowerCase().trim();
            if (rawTier && ['growth', 'gold', 'pro'].includes(rawTier)) {
                tier = rawTier === 'pro' ? 'gold' : (rawTier as SubscriptionTier);
            } else if (isPremium) {
                tier = 'gold';
            }

            const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

            // Prepare object
            // Note: We avoid 'email' if it's not in the schema.
            // Based on previous analysis, 'email' is NOT in the businesses table.
            const insertPayload: any = {
                id: businessId,
                name: normalizedName,
                category: mappedCategory,
                subcategory: mappedSubcategory,
                city: normalizedCity,
                quartier: null, // Could try to extract from location
                location: normalizedLocation || normalizedCity, // Address field is often called 'location' in legacy, or 'address' in new.
                // Checking seed script: uses 'location'.
                // Checking types: uses 'location' and 'address'.
                // We'll map row.location to DB 'location' (or 'address' if schema requires).
                // Existing seed uses 'location'.
                description: normalizedDescription || '',
                phone: row.phone || null,
                website: row.website || null,
                is_premium: isPremium,
                tier: tier,
                tags: tags,
                // Defaults
                type: 'company',
                is_featured: false,
                overall_rating: 0,
                search_vector: null // Let DB handle it or trigger
            };

            // Add address if column exists (it does in seed, wait: seed uses 'location' mapping to 'location'?)
            // Seed: location: business.location
            // Types: address?: string
            // DB Schema: businesses usually have 'location' (text) or 'address' (text).
            // Let's assume 'location' is the column name for the full address as per historical usage.
            // If 'address' column was added specifically, we might want to populate that too.
            // The Admin createBusiness uses 'address' parameter mapping to 'address' column?
            // "address: data.address" -> insert({ address: data.address })
            // So 'address' column likely exists.
            if (normalizedLocation) {
                insertPayload['address'] = normalizedLocation;
            }

            const { error } = await supabase
                .from('businesses')
                .upsert(insertPayload, { onConflict: 'id' });

            if (error) {
                errors.push(`Erreur pour "${row.name}": ${error.message}`);
            } else {
                successCount++;
            }

        } catch (err: any) {
            errors.push(`Exception pour "${row.name}": ${err.message}`);
        }
    }

    return {
        success: successCount > 0,
        count: successCount,
        errors
    };
}

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';
import { AdminActionResult } from './admin';

export type Category = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    position: number;
    is_active: boolean;
};

export type Subcategory = {
    id: string;
    category_id: string;
    name: string;
    slug: string;
    position: number;
    is_active: boolean;
};

/**
 * Fetch all categories
 */
export async function getCategories(): Promise<Category[]> {
    const serviceClient = await createAdminClient();
    const { data, error } = await serviceClient
        .from('categories')
        .select('*')
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error.message, error.code, error);
        return [];
    }
    return data || [];
}

/**
 * Fetch all active categories (public)
 */
export async function getActiveCategories(): Promise<Category[]> {
    const serviceClient = await createAdminClient();
    const { data, error } = await serviceClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching active categories:', error.message, error.code, error);
        return [];
    }
    return data || [];
}

/**
 * Fetch subcategories for a category
 */
export async function getSubcategories(categoryId: string): Promise<Subcategory[]> {
    const serviceClient = await createAdminClient();
    const { data, error } = await serviceClient
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching subcategories:', error.message, error.code, error);
        return [];
    }
    return data || [];
}

/**
 * Fetch a category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
    const serviceClient = await createAdminClient();
    const { data, error } = await serviceClient
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        return null;
    }
    return data;
}

/**
 * Fetch a subcategory by slug
 */
export async function getSubcategoryBySlug(slug: string, categoryId?: string): Promise<Subcategory | null> {
    const serviceClient = await createAdminClient();
    let query = serviceClient.from('subcategories').select('*').eq('slug', slug);
    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query.single();

    if (error) {
        return null;
    }
    return data;
}

/**
 * Fetch a category by name
 */
export async function getCategoryByName(name: string): Promise<Category | null> {
    const serviceClient = await createAdminClient();
    const { data, error } = await serviceClient
        .from('categories')
        .select('*')
        .eq('name', name)
        .single();

    if (error) {
        return null;
    }
    return data;
}

/**
 * Create or update a category
 */
export async function upsertCategory(data: Partial<Category>): Promise<AdminActionResult> {
    try {
        const adminId = await verifyAdminSession();
        const serviceClient = await createAdminClient();

        const isNew = !data.id;

        const { data: category, error } = await serviceClient
            .from('categories')
            .upsert({
                ...data,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return { status: 'error', message: `Erreur: ${error.message}` };
        }

        await logAuditAction({
            adminId,
            action: isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY',
            targetType: 'category',
            targetId: category.id,
            details: data
        });

        revalidatePath('/admin/categories');
        revalidatePath('/categories');
        revalidatePath('/');

        return { status: 'success', message: 'Catégorie enregistrée avec succès.', data: category };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur est survenue.' };
    }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<AdminActionResult> {
    try {
        const adminId = await verifyAdminSession();
        const serviceClient = await createAdminClient();

        const { error } = await serviceClient
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            return { status: 'error', message: `Erreur: ${error.message}` };
        }

        await logAuditAction({
            adminId,
            action: 'DELETE_CATEGORY',
            targetType: 'category',
            targetId: id
        });

        revalidatePath('/admin/categories');
        revalidatePath('/categories');
        revalidatePath('/');

        return { status: 'success', message: 'Catégorie supprimée avec succès.' };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur est survenue.' };
    }
}

/**
 * Create or update a subcategory
 */
export async function upsertSubcategory(data: Partial<Subcategory>): Promise<AdminActionResult> {
    try {
        const adminId = await verifyAdminSession();
        const serviceClient = await createAdminClient();

        const isNew = !data.id;

        const { data: subcategory, error } = await serviceClient
            .from('subcategories')
            .upsert({
                ...data,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return { status: 'error', message: `Erreur: ${error.message}` };
        }

        await logAuditAction({
            adminId,
            action: isNew ? 'CREATE_SUBCATEGORY' : 'UPDATE_SUBCATEGORY',
            targetType: 'subcategory',
            targetId: subcategory.id,
            details: data
        });

        revalidatePath('/admin/categories');
        revalidatePath('/categories');

        return { status: 'success', message: 'Sous-catégorie enregistrée avec succès.', data: subcategory };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur est survenue.' };
    }
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(id: string): Promise<AdminActionResult> {
    try {
        const adminId = await verifyAdminSession();
        const serviceClient = await createAdminClient();

        const { error } = await serviceClient
            .from('subcategories')
            .delete()
            .eq('id', id);

        if (error) {
            return { status: 'error', message: `Erreur: ${error.message}` };
        }

        await logAuditAction({
            adminId,
            action: 'DELETE_SUBCATEGORY',
            targetType: 'subcategory',
            targetId: id
        });

        revalidatePath('/admin/categories');
        revalidatePath('/categories');

        return { status: 'success', message: 'Sous-catégorie supprimée avec succès.' };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur est survenue.' };
    }
}

/**
 * Sync categories and subcategories from existing businesses
 */
export async function syncCategoriesFromBusinesses(): Promise<AdminActionResult> {
    try {
        await verifyAdminSession();
        const serviceClient = await createAdminClient();

        // 1. Get all unique categories and their subcategories from businesses
        const { data: businesses, error: fetchError } = await serviceClient
            .from('businesses')
            .select('category, subcategory')
            .not('category', 'is', null);

        if (fetchError) {
            return { status: 'error', message: `Erreur récupération businesses: ${fetchError.message}` };
        }

        const catMap = new Map<string, Set<string>>();
        businesses?.forEach(b => {
            if (!catMap.has(b.category)) {
                catMap.set(b.category, new Set());
            }
            if (b.subcategory) {
                catMap.get(b.category)!.add(b.subcategory);
            }
        });

        let createdCats = 0;
        let createdSubs = 0;

        // 2. Process each category
        for (const [catName, subcats] of catMap.entries()) {
            const catSlug = catName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

            // Upsert category
            const { data: cat, error: catError } = await serviceClient
                .from('categories')
                .upsert({
                    name: catName,
                    slug: catSlug,
                    is_active: true
                }, { onConflict: 'slug' })
                .select()
                .single();

            if (catError) {
                console.error(`Error syncing category ${catName}:`, catError);
                continue;
            }
            createdCats++;

            // Upsert subcategories
            for (const subName of subcats) {
                const subSlug = subName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                const { error: subError } = await serviceClient
                    .from('subcategories')
                    .upsert({
                        category_id: cat.id,
                        name: subName,
                        slug: subSlug,
                        is_active: true
                    }, { onConflict: 'category_id, slug' });

                if (subError) {
                    console.error(`Error syncing subcategory ${subName} for ${catName}:`, subError);
                    continue;
                }
                createdSubs++;
            }
        }

        revalidatePath('/admin/categories');
        revalidatePath('/categories');
        revalidatePath('/');

        return {
            status: 'success',
            message: `Synchronisation terminée: ${createdCats} catégories et ${createdSubs} sous-catégories traitées.`
        };
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Une erreur est survenue lors de la synchronisation.' };
    }
}

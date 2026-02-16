'use server';

import type { Business, PaginatedBusinesses, SeasonalCollection } from '@/lib/types';
import { getPublicClient } from './client';
import { mapBusinessFromDB, mapCollectionFromDB } from './mappers';

export type BusinessFilters = {
    search?: string;
    category?: string;
    subcategory?: string;
    type?: string;
    city?: string;
    quartier?: string;
    rating?: number;
    companySize?: string;
    benefits?: string[];
    amenities?: string[];
    tag?: string;
    page?: number;
    limit?: number;
    sort?: 'relevance' | 'rating' | 'reviews' | 'newest';
    minimal?: boolean;
    featured?: boolean;
};

export type CategoryWithCount = {
    name: string;
    count: number;
};

export type HomeMetrics = {
    businessCount: number;
    reviewCount: number;
};

export const getFilteredBusinesses = async (filters: BusinessFilters = {}): Promise<PaginatedBusinesses> => {
    const supabase = getPublicClient();
    const {
        search,
        category,
        subcategory,
        type,
        city,
        quartier,
        rating,
        companySize,
        benefits,
        amenities,
        tag,
        page = 1,
        limit = 12,
        sort = 'relevance',
        featured = false
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query string based on whether we need full details or minimal
    const selectQuery = filters.minimal
        ? `
      *,
      business_hours (day_of_week)
    `
        : `
      *,
      reviews (*),
      updates (*),
      business_hours (*)
    `;

    let query = supabase
        .from('businesses')
        .select(selectQuery, { count: 'exact' });

    // Apply filters
    if (search && search.trim().length > 0) {
        const safeSearch = search.trim().replace(/[%(),]/g, ' ');
        // search in name, description, category, subcategory, city, quartier AND tags
        query = query.or(
            `name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%,subcategory.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%,quartier.ilike.%${safeSearch}%,tags.cs.{${safeSearch}}`
        );
    }
    if (category && category !== 'all') {
        query = query.eq('category', category);
    }
    if (subcategory && subcategory !== 'all') {
        query = query.eq('subcategory', subcategory);
    }
    if (type && type !== 'all') {
        query = query.eq('type', type);
    }
    if (city && city !== 'all') {
        query = query.eq('city', city);
    }
    if (quartier && quartier !== 'all') {
        query = query.eq('quartier', quartier);
    }
    if (rating && rating > 0) {
        query = query.gte('overall_rating', rating);
    }
    if (companySize && companySize.length > 0) {
        query = query.eq('company_size', companySize);
    }
    const amenitiesFilter = (amenities && amenities.length > 0)
        ? amenities
        : (benefits && benefits.length > 0 ? benefits : undefined);
    if (amenitiesFilter && amenitiesFilter.length > 0) {
        // Supabase array filtering: overlap or contains
        query = query.contains('amenities', amenitiesFilter);
    }
    if (tag) {
        query = query.contains('tags', [tag]);
    }
    if (featured) {
        query = query.eq('is_featured', true);
    }

    // Pagination
    query = query.range(from, to);

    // Sorting
    if (sort === 'rating') {
        query = query.order('overall_rating', { ascending: false });
    } else if (sort === 'reviews') {
        query = query.order('review_count', { ascending: false });
    } else if (sort === 'newest') {
        query = query.order('created_at', { ascending: false });
    } else {
        // relevance: Sponsored ads first, then tiers (Gold > Growth > Standard), then fallback to legacy is_premium
        // We use ascending: true for tier because 'gold' < 'growth' < 'standard' alphabetically
        query = query.order('is_sponsored', { ascending: false })
            .order('tier', { ascending: true })
            .order('is_premium', { ascending: false })
            .order('overall_rating', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching filtered businesses:', error);

        return {
            businesses: [],
            totalCount: 0,
            page,
            limit,
            totalPages: 0
        };
    }

    const businesses = data.map(mapBusinessFromDB);
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        businesses,
        totalCount,
        page,
        limit,
        totalPages
    };
};

export const getBusinessById = async (id: string): Promise<Business | null> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('businesses')
        .select(`
      *,
      reviews (*),
      updates (*),
      business_hours (*)
    `)
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return mapBusinessFromDB(data);
};

export const getCategoriesWithCount = async (): Promise<CategoryWithCount[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('businesses')
        .select('category');

    if (error || !data) {
        return [];
    }

    const counts: Record<string, number> = {};
    data.forEach((item: { category: string | null }) => {
        if (item.category) {
            counts[item.category] = (counts[item.category] || 0) + 1;
        }
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
};

export const getHomeMetrics = async (): Promise<HomeMetrics> => {
    const supabase = getPublicClient();

    const { count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true });

    return {
        businessCount: businessCount || 0,
        reviewCount: reviewCount || 0
    };
};

export const getSeasonalCollections = async (): Promise<SeasonalCollection[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('seasonal_collections')
        .select(`
      *,
      businesses (*)
    `)
        .eq('active', true)
        .order('order_index');

    if (error || !data) {
        return [];
    }

    return data.map(mapCollectionFromDB);
};

/**
 * Get all unique categories from businesses table
 */
export const getAllCategories = async (): Promise<string[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('businesses')
        .select('category')
        .not('category', 'is', null);

    if (error || !data) {
        return [];
    }

    const categoriesSet = new Set<string>();
    data.forEach((item: any) => {
        if (item.category && typeof item.category === 'string') {
            categoriesSet.add(item.category);
        }
    });
    return Array.from(categoriesSet).sort();
};

/**
 * Get all subcategories for a specific category
 */
export const getSubcategoriesByCategory = async (category: string): Promise<string[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('businesses')
        .select('subcategory')
        .eq('category', category)
        .not('subcategory', 'is', null);

    if (error || !data) {
        return [];
    }

    const subcategoriesSet = new Set<string>();
    data.forEach((item: any) => {
        if (item.subcategory && typeof item.subcategory === 'string') {
            subcategoriesSet.add(item.subcategory);
        }
    });
    return Array.from(subcategoriesSet).sort();
};

/**
 * Get all unique amenities from businesses table
 */
export const getAmenities = async (): Promise<string[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('businesses')
        .select('amenities')
        .not('amenities', 'is', null);

    if (error || !data) {
        return [];
    }

    const amenitiesSet = new Set<string>();
    data.forEach((item: any) => {
        if (item.amenities && Array.isArray(item.amenities)) {
            item.amenities.forEach((amenity: any) => {
                if (typeof amenity === 'string') {
                    amenitiesSet.add(amenity);
                }
            });
        }
    });
    return Array.from(amenitiesSet).sort();
};

/**
 * Alias for getAmenities for backward compatibility
 */
export const getAllBenefits = getAmenities;




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
    if (search) {
        // Use FTS for the search query
        query = query.textSearch('search_vector', search, {
            config: 'french',
            type: 'websearch'
        });
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
        // relevance: Sponsored ads first, then tiers (PRO > Growth > None), then fallback to legacy is_premium
        query = query.order('is_sponsored', { ascending: false }).order('tier', { ascending: false }).order('is_premium', { ascending: false }).order('overall_rating', { ascending: false });
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

export const getBusinesses = async (filters?: BusinessFilters): Promise<Business[]> => {
    // Use filtered version for better performance with large datasets
    const result = await getFilteredBusinesses({
        ...filters,
        limit: filters?.limit || 50,
        minimal: filters?.minimal !== false,
    });

    return result.businesses;
};

export const getHomeMetrics = async (): Promise<HomeMetrics> => {
    const supabase = getPublicClient();

    const [{ count: businessCount }, { count: reviewCount }] = await Promise.all([
        supabase
            .from('businesses')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'deleted'),
        supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published'),
    ]);

    return {
        businessCount: businessCount || 0,
        reviewCount: reviewCount || 0,
    };
};

export const getAllCategories = async (): Promise<string[]> => {
    const supabase = getPublicClient();

    // Optimized: Use the dedicated categories table instead of scanning all businesses
    const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

    if (error || !data || data.length === 0) {
        // Fallback to minimal scan of businesses if table is empty
        const { data: fallbackData } = await supabase
            .from('businesses')
            .select('category')
            .not('category', 'is', null);

        if (!fallbackData) return [];
        return Array.from(new Set(fallbackData.map((item: any) => item.category))).sort() as string[];
    }

    return data.map((item: { name: string }) => item.name);
};

export const getCategoriesWithCounts = async (): Promise<CategoryWithCount[]> => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('businesses')
        .select('category');

    if (error || !data) return [];

    const counts: Record<string, number> = {};
    data.forEach((item: any) => {
        if (item.category) {
            counts[item.category] = (counts[item.category] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
};

export const getSubcategoriesByCategory = async (category: string): Promise<string[]> => {
    if (!category || category === 'all') return [];
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('businesses')
        .select('subcategory')
        .eq('category', category)
        .not('subcategory', 'is', null);

    if (error || !data) return [];
    const subs = data.map((item: any) => item.subcategory).filter(Boolean) as string[];
    return subs.filter((v, i, a) => a.indexOf(v) === i).sort();
};

export const getAllBenefits = async (): Promise<string[]> => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('businesses')
        .select('benefits');

    if (error || !data) return [];
    const allBenefits = data.flatMap((item: any) => item.benefits || []) as string[];
    return allBenefits.filter((v, i, a) => a.indexOf(v) === i).sort();
};

export async function getBusinessById(id: string): Promise<Business | undefined> {
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

    if (error) {
        console.error(`Error fetching business ${id}:`, error.message);
        return undefined;
    }

    if (!data) return undefined;

    return mapBusinessFromDB(data);
}

export async function getBusinessBySlug(slug: string): Promise<Business | undefined> {
    return getBusinessById(slug);
}

export async function getBusinessReviews(businessId: string) {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'published');

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
    return data;
}

export async function getFeaturedBusinesses() {
    return (await getFilteredBusinesses({ featured: true, limit: 12 })).businesses;
}

export async function getBusinessCategories() {
    return getAllCategories();
}

export async function getBusinessHours(businessId: string) {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId);

    if (error) {
        console.error('Error fetching business hours:', error);
        return [];
    }
    return data;
}

export const getBusinessesPublic = async (): Promise<Business[]> => {
    const supabase = getPublicClient();

    // WARNING: This fetches ALL businesses. Use with caution or replace with filtered queries.
    // Optimized to only fetch minimal fields needed for public listings
    const { data, error } = await supabase
        .from('businesses')
        .select(`
            id, name, logo_url, category, city, quartier, overall_rating, review_count, is_premium, tier
        `)
        .limit(100); // Added safety limit

    if (error) {
        console.error('Error fetching businesses (public):', error);
        return [];
    }

    return data.map(mapBusinessFromDB);
};

/**
 * Specifically for sitemap generation - ultra minimal fetch
 */
export const getBusinessesForSitemap = async () => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('businesses')
        .select('id, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching businesses for sitemap:', error);
        return [];
    }
    return data;
};

export const getSeasonalCollections = async (): Promise<SeasonalCollection[]> => {
    const supabase = getPublicClient();

    const { data, error } = await supabase
        .from('seasonal_collections')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        if (error) console.error('Error fetching collections:', error);
        // Return empty array - collections are managed via admin panel
        return [];
    }

    return data.map(mapCollectionFromDB);
};

export const getAmenities = async () => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('is_active', true)
        .order('group_name', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        // Quietly fail if table doesn't exist yet (migration pending)
        if (error.code !== '42P01') { // 42P01 is undefined_table
            console.warn('Warning fetching amenities:', error.message);
        }
        return [];
    }

    // Group by group_name
    const grouped: Record<string, { group: string, amenities: string[] }> = {};

    data?.forEach((item: any) => {
        if (!grouped[item.group_name]) {
            grouped[item.group_name] = { group: item.group_name, amenities: [] };
        }
        grouped[item.group_name].amenities.push(item.name);
    });

    return Object.values(grouped);
};

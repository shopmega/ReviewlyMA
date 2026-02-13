'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type SearchSuggestion = {
    id: string;
    name: string;
    type: 'business' | 'category';
    city?: string;
    category?: string;
    slug?: string;
};

export async function getSearchSuggestions(query: string, city?: string): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) return [];
    const normalizedCity = city && city.trim().toLowerCase() !== 'toutes les villes'
        ? city.trim()
        : undefined;

    const supabase = await createServiceClient();
    const suggestions: SearchSuggestion[] = [];

    // 1. Search Businesses (ILIKE fallback-friendly; works even when search_vector is not populated)
    let businessQuery = supabase
        .from('businesses')
        .select('id, name, city, category')
        .or(
            `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,city.ilike.%${query}%`
        )
        .limit(5);

    if (normalizedCity) {
        businessQuery = businessQuery.eq('city', normalizedCity);
    }

    const { data: businesses } = await businessQuery;

    if (businesses) {
        (businesses as any[]).forEach(b => {
            suggestions.push({
                id: b.id,
                name: b.name,
                type: 'business',
                city: b.city,
                category: b.category
            });
        });
    }

    // 2. Search Categories
    let categoryQuery = supabase
        .from('businesses')
        .select('category')
        .ilike('category', `%${query}%`)
        .limit(5);

    if (normalizedCity) {
        categoryQuery = categoryQuery.eq('city', normalizedCity);
    }

    const { data: categories } = await categoryQuery;

    if (categories) {
        const uniqueCategories = Array.from(new Set((categories as any[]).map(c => c.category as string)));
        uniqueCategories.forEach(cat => {
            if (!suggestions.some(s => s.type === 'category' && s.name === cat)) {
                suggestions.push({
                    id: `cat-${cat}`,
                    name: cat,
                    type: 'category',
                    slug: cat.toLowerCase().replace(/\s+/g, '-')
                });
            }
        });
    }

    return suggestions.slice(0, 8);
}

export async function logSearch(query: string, city?: string, resultsCount: number = 0) {
    if (!query || query.length < 2) return;

    try {
        const supabase = await createServiceClient();
        const cookieStore = await cookies();
        const sessionId = (await cookieStore).get('sb-session-id')?.value || 'anonymous';

        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('analytics_events').insert({
            event: 'search_performed',
            user_id: user?.id,
            session_id: sessionId,
            properties: {
                query,
                city,
                results_count: resultsCount
            }
        });

        // Also log to the specialized search_analytics table if it exists
        await supabase.from('search_analytics').insert({
            query,
            city,
            results_count: resultsCount,
            user_id: user?.id,
            session_id: sessionId
        });
    } catch (error) {
        console.error('Error logging search:', error);
    }
}

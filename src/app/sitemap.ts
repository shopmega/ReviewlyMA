
import { MetadataRoute } from 'next';
import { getActiveCategories } from '@/app/actions/categories';
import { ALL_CITIES } from '@/lib/location-discovery';
import { slugify } from '@/lib/utils';
import { getServerSiteUrl } from '@/lib/site-config';

// Keep sitemap reasonably fresh without requiring build-time DB access.
export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getServerSiteUrl();

    // 1. Static Pages
    const staticPages = [
        '',
        '/businesses',
        '/categories',
        '/villes',
        '/about',
        '/contact',
        '/pour-les-pros',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // 2. Fetch all businesses (minimal data for sitemap)
    // If Supabase env vars are missing (local build/CI), fall back to static-only sitemap.
    let businesses: Array<{ id: string; created_at?: string }> = [];
    try {
        const { getBusinessesForSitemap } = await import('@/lib/data');
        businesses = await getBusinessesForSitemap();
    } catch (e) {
        businesses = [];
    }

    const businessPages = businesses.map((business) => ({
        url: `${baseUrl}/businesses/${business.id}`,
        lastModified: business.created_at ? new Date(business.created_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    // 3. Fetch all active categories
    let categories: Array<{ slug: string }> = [];
    try {
        categories = await getActiveCategories();
    } catch (e) {
        categories = [];
    }

    // Category Pages
    const categoryPages = categories.map((cat) => ({
        url: `${baseUrl}/categorie/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    // City Pages
    const cityPages = ALL_CITIES.map((city) => ({
        url: `${baseUrl}/ville/${slugify(city)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    // 4. Combined Pages (Top Combos)
    // We'll generate combined pages for top cities and all categories
    const topCities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger'];
    const combinedPages: any[] = [];

    for (const city of topCities) {
        for (const cat of categories) {
            combinedPages.push({
                url: `${baseUrl}/ville/${slugify(city)}/${cat.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.5,
            });
        }
    }

    return [
        ...staticPages,
        ...businessPages,
        ...categoryPages,
        ...cityPages,
        ...combinedPages
    ];
}

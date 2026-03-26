
import { MetadataRoute } from 'next';
import { getActiveCategories } from '@/app/actions/categories';
import { ALL_CITIES } from '@/lib/location-discovery';
import { slugify } from '@/lib/utils';
import { getServerSiteUrl } from '@/lib/site-config';
import { getMergedBlogPosts } from '@/lib/data';

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
        '/blog',
        '/job-offers',
        '/salaires',
        '/salaires/partager',
        '/salaires/comparaison',
        '/about',
        '/contact',
        '/pro',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // 2. Fetch businesses (minimal data)
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

    const blogPages = (await getMergedBlogPosts()).map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt || post.publishedAt),
        changeFrequency: 'monthly' as const,
        priority: post.category === 'pillar' ? 0.78 : 0.72,
    }));

    // 3. Categories and Cities
    let categories: Array<{ slug: string }> = [];
    try {
        categories = await getActiveCategories();
    } catch (e) {
        categories = [];
    }

    const categoryPages = categories.map((cat) => ({
        url: `${baseUrl}/categorie/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    const cityPages = ALL_CITIES.map((city) => ({
        url: `${baseUrl}/ville/${slugify(city)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    // 4. Salary SEO pages
    let salaryRoleCityPages: MetadataRoute.Sitemap = [];
    let salarySectorCityPages: MetadataRoute.Sitemap = [];
    try {
        const { getTopSalaryRoleCityPairs, getTopSalarySectorCityPairs } = await import('@/lib/data/salaries');
        const [roleCityPairs, sectorCityPairs] = await Promise.all([
            getTopSalaryRoleCityPairs(120),
            getTopSalarySectorCityPairs(120),
        ]);

        salaryRoleCityPages = roleCityPairs.map((item) => ({
            url: `${baseUrl}/salaires/${slugify(item.job_title)}/${item.city_slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));

        salarySectorCityPages = sectorCityPairs.map((item) => ({
            url: `${baseUrl}/salaires/secteur/${item.sector_slug}/${item.city_slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.65,
        }));
    } catch (e) {
        salaryRoleCityPages = [];
        salarySectorCityPages = [];
    }

    // 5. Combined Pages (Top Combos)
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
        ...blogPages,
        ...categoryPages,
        ...cityPages,
        ...combinedPages,
        ...salaryRoleCityPages,
        ...salarySectorCityPages
    ];
}

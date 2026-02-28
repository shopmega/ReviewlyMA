
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
        '/parrainages',
        '/parrainages/demandes',
        '/salaires',
        '/salaires/partager',
        '/salaires/comparaison',
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
    let referralOffers: Array<{ id: string; created_at?: string; expires_at?: string | null }> = [];
    let referralDemandListings: Array<{ id: string; created_at?: string; expires_at?: string | null }> = [];
    try {
        const { getBusinessesForSitemap } = await import('@/lib/data');
        businesses = await getBusinessesForSitemap();
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const admin = await createAdminClient();
        const { data: referralData } = await admin
            .from('job_referral_offers')
            .select('id, created_at, expires_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(500);
        referralOffers = (referralData || []) as Array<{ id: string; created_at?: string; expires_at?: string | null }>;
        const { data: demandData } = await admin
            .from('job_referral_demand_listings')
            .select('id, created_at, expires_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(500);
        referralDemandListings = (demandData || []) as Array<{ id: string; created_at?: string; expires_at?: string | null }>;
    } catch (e) {
        businesses = [];
        referralOffers = [];
        referralDemandListings = [];
    }

    const businessPages = businesses.map((business) => ({
        url: `${baseUrl}/businesses/${business.id}`,
        lastModified: business.created_at ? new Date(business.created_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    const referralOfferPages = referralOffers.map((offer) => ({
        url: `${baseUrl}/parrainages/${offer.id}`,
        lastModified: offer.expires_at ? new Date(offer.expires_at) : offer.created_at ? new Date(offer.created_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.75,
    }));

    const referralDemandPages = referralDemandListings.map((listing) => ({
        url: `${baseUrl}/parrainages/demandes/${listing.id}`,
        lastModified: listing.expires_at ? new Date(listing.expires_at) : listing.created_at ? new Date(listing.created_at) : new Date(),
        changeFrequency: 'daily' as const,
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

    // Salary SEO pages (role/city + sector/city)
    let salaryRoleCityPages: MetadataRoute.Sitemap = [];
    let salarySectorCityPages: MetadataRoute.Sitemap = [];
    try {
        const { getTopSalaryRoleCityPairs, getTopSalarySectorCityPairs } = await import('@/lib/data/salaries');
        const [roleCityPairs, sectorCityPairs] = await Promise.all([
            getTopSalaryRoleCityPairs(120),
            getTopSalarySectorCityPairs(120),
        ]);

        salaryRoleCityPages = roleCityPairs.map((item) => ({
            url: `${baseUrl}/salaires/role/${slugify(item.job_title)}/${item.city_slug}`,
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
        ...referralOfferPages,
        ...referralDemandPages,
        ...categoryPages,
        ...cityPages,
        ...combinedPages,
        ...salaryRoleCityPages,
        ...salarySectorCityPages
    ];
}

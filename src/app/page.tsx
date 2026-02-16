import { getCachedBusinesses, getCachedSeasonalCollections, getCachedSiteSettings, getCachedActiveCategories, getCachedFeaturedBusinesses, getCachedHomeMetrics } from '@/lib/cache';
import { LazyHomeClient } from '@/components/shared/performance';

// Homepage uses live Supabase data; avoid build-time pre-render coupling.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [businesses, seasonalCollections, siteSettings, categories, featuredBusinesses, metrics] = await Promise.all([
    getCachedBusinesses({ limit: 12, minimal: false }), // Fetch small set with details for stats
    getCachedSeasonalCollections(),
    getCachedSiteSettings(),
    getCachedActiveCategories(),
    getCachedFeaturedBusinesses(),
    getCachedHomeMetrics(),
  ]);

  return (
    <LazyHomeClient
      initialBusinesses={businesses.businesses || []}
      seasonalCollections={seasonalCollections}
      siteSettings={siteSettings}
      categories={categories}
      featuredBusinesses={featuredBusinesses}
      metrics={metrics}
    />
  );
}

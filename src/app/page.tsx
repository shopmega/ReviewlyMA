import { getCachedBusinesses, getCachedSeasonalCollections, getCachedSiteSettings, getCachedActiveCategories, getCachedFeaturedBusinesses, getCachedHomeMetrics, getCachedRecentPublicAnalyses } from '@/lib/cache';
import { LazyHomeClient } from '@/components/shared/performance';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

// Homepage uses live Supabase data; avoid build-time pre-render coupling.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [businesses, seasonalCollections, siteSettings, categories, featuredBusinesses, metrics, recentAnalyses] = await Promise.all([
    getCachedBusinesses({ limit: 12, minimal: false }), // Fetch small set with details for stats
    getCachedSeasonalCollections(),
    getCachedSiteSettings(),
    getCachedActiveCategories(),
    getCachedFeaturedBusinesses(),
    getCachedHomeMetrics(),
    getCachedRecentPublicAnalyses(6),
  ]);

  return (
    <div className="space-y-6">
      <div className="container mx-auto px-4 md:px-6 pt-6">
        <InternalAdsSlot placement="home_top_banner" limit={1} />
      </div>
      <LazyHomeClient
        initialBusinesses={businesses.businesses || []}
        seasonalCollections={seasonalCollections}
        siteSettings={siteSettings}
        categories={categories}
        featuredBusinesses={featuredBusinesses}
        metrics={metrics}
        recentAnalyses={recentAnalyses}
      />
    </div>
  );
}

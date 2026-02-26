import { getBusinessById, getFilteredBusinesses, getSiteSettings } from '@/lib/data';
import { LazyBusinessHero, LazyPhotoGallery } from '@/components/shared/performance';
import { AnalyticsTracker } from '@/components/shared/AnalyticsTracker';
import { BusinessSidebar } from '@/components/business/BusinessSidebar';
import { BusinessPageActions } from '@/components/shared/BusinessPageActions';
import { AboutSection } from '@/components/business/AboutSection';
import { UpdatesSection } from '@/components/business/UpdatesSection';
import { SimilarBusinesses } from '@/components/business/SimilarBusinesses';
import CompetitorAds from '@/components/business/CompetitorAds';
import { BusinessInsightsTabs } from '@/components/business/BusinessInsightsTabs';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { Business } from '@/lib/types';
import { getServerSiteUrl } from '@/lib/site-config';
import { getPublishedSalariesByBusiness, getSalaryStatsByBusiness } from '@/lib/data/salaries';
import { applyBusinessQaPreview, parseQaPreviewState, REAL_QA_PREVIEW_STATE, type QaPreviewState } from '@/lib/qa-preview';
import { AdminQaPreviewToggle } from '@/components/business/AdminQaPreviewToggle';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessById(slug);

  if (!business) {
    return {
      title: 'Établissement non trouvé',
    };
  }

  const title = `${business.name} | Avis, Horaires et Contact à ${business.city}`;
  const description = business.description?.substring(0, 160) || `Découvrez les avis, horaires, photos et informations de contact de ${business.name} à ${business.city}.`;
  const logoImage = business.logo?.imageUrl;
  const hasRealLogo = !!logoImage && !logoImage.includes('/placeholders/');
  const image = business.cover_url || (hasRealLogo ? logoImage : '/opengraph-image');
  const siteUrl = getServerSiteUrl();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/businesses/${business.id}`,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: business.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `${siteUrl}/businesses/${business.id}`,
    },
  };
}

export default async function BusinessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedQaPreviewRaw = resolvedSearchParams.qa_preview;
  const requestedQaReviewsRaw = resolvedSearchParams.qa_reviews;
  const requestedQaSalariesRaw = resolvedSearchParams.qa_salaries;
  const requestedQaPreviewState = parseQaPreviewState({
    previewRaw: Array.isArray(requestedQaPreviewRaw) ? requestedQaPreviewRaw[0] : requestedQaPreviewRaw,
    reviewsRaw: Array.isArray(requestedQaReviewsRaw) ? requestedQaReviewsRaw[0] : requestedQaReviewsRaw,
    salariesRaw: Array.isArray(requestedQaSalariesRaw) ? requestedQaSalariesRaw[0] : requestedQaSalariesRaw,
  });

  // 1. Fetch Data
  const business = await getBusinessById(slug);
  const settings = await getSiteSettings();

  if (!business) {
    notFound();
  }

  const [salaryStats, salaryEntries] = settings.enable_salaries
    ? await Promise.all([
      getSalaryStatsByBusiness(business.id),
      getPublishedSalariesByBusiness(business.id, 10),
    ])
    : [{ count: 0, medianMonthly: null, minMonthly: null, maxMonthly: null, currency: 'MAD', roleBreakdown: [] }, []];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    userRole = profile?.role ?? null;
  }
  const isAdmin = userRole === 'admin';
  const qaPreviewState: QaPreviewState = isAdmin ? requestedQaPreviewState : REAL_QA_PREVIEW_STATE;
  const previewed = isAdmin
    ? applyBusinessQaPreview(business, salaryStats, salaryEntries, qaPreviewState)
    : { business, salaryStats, salaryEntries };
  const displayedBusiness = previewed.business;
  const displayedSalaryStats = previewed.salaryStats;
  const displayedSalaryEntries = previewed.salaryEntries;

  const hasAboutContent =
    !!displayedBusiness.description?.trim()
    || (Array.isArray(displayedBusiness.amenities) && displayedBusiness.amenities.length > 0);

  // JSON-LD Structured Data
  const siteUrl = getServerSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": displayedBusiness.name,
    "description": displayedBusiness.description,
    "image": displayedBusiness.logo?.imageUrl,
    "telephone": displayedBusiness.phone,
    "url": `${siteUrl}/businesses/${displayedBusiness.id}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": displayedBusiness.city,
      "addressRegion": displayedBusiness.quartier,
      "streetAddress": displayedBusiness.location,
      "addressCountry": "MA"
    },
    "aggregateRating": displayedBusiness.overallRating > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": displayedBusiness.overallRating,
      "reviewCount": displayedBusiness.reviews?.length || 0,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined,
    "review": displayedBusiness.reviews?.slice(0, 5).map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.author || 'Anonyme'
      },
      "datePublished": r.date,
      "reviewBody": r.text,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating
      }
    }))
  };

  // Fetch similar businesses with better caching
  let similarBusinesses: Business[] = [];
  if (business.category && business.city) {
    // Use cached version for better performance
    const { getCachedBusinesses } = await import('@/lib/cache');

    // Attempt with subcategory first for better relevance
    let result = await getCachedBusinesses({
      category: business.category,
      subcategory: business.subcategory,
      city: business.city,
      limit: 8,
      minimal: true // Use minimal data for similar businesses
    });

    let similar = (result.businesses || []).filter((b: Business) => b.id !== business.id);

    // If not enough similar businesses with subcategory, fall back to just category
    if (business.subcategory && similar.length < 3) {
      const categoryResults = await getCachedBusinesses({
        category: business.category,
        city: business.city,
        limit: 8,
        minimal: true
      });

      // Combine results, maintaining uniqueness
      (categoryResults.businesses || []).forEach((b: Business) => {
        if (b.id !== business.id && !similar.find((s: Business) => s.id === b.id)) {
          similar.push(b);
        }
      });
    }

    similarBusinesses = similar.slice(0, 3); // Show top 3
  }

  // Check if current user is following this business
  let isFollowing = false;
  if (user) {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business.id)
      .single();
    isFollowing = !!data;
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Analytics Tracking */}
      <AnalyticsTracker businessId={displayedBusiness.id} />

      {isAdmin && <AdminQaPreviewToggle state={qaPreviewState} />}

      {/* Hero Section */}
      <LazyBusinessHero business={displayedBusiness} />

      {/* Dedicated actions section to avoid hero overflow on mobile */}
      <section className="w-full border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <BusinessPageActions business={displayedBusiness} isFollowing={isFollowing} />
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Content (Left) */}
          <div className="lg:w-2/3 space-y-8 order-last lg:order-first">
            <BusinessInsightsTabs
              business={displayedBusiness}
              enableSalaries={settings.enable_salaries}
              salaryStats={displayedSalaryStats}
              salaryEntries={displayedSalaryEntries}
              salaryRoles={settings.salary_roles || []}
              salaryDepartments={settings.salary_departments || []}
              salaryIntervals={settings.salary_intervals || []}
            />

            {hasAboutContent && <AboutSection business={displayedBusiness} />}

            <LazyPhotoGallery photos={displayedBusiness.photos} businessName={displayedBusiness.name} businessId={displayedBusiness.id} />

            {displayedBusiness.updates && displayedBusiness.updates.length > 0 && (
              <UpdatesSection updates={displayedBusiness.updates} />
            )}

            {settings.enable_competitor_ads && (
              <CompetitorAds
                businessId={displayedBusiness.id}
                trackingEnabled={settings.enable_competitor_ads_tracking}
              />
            )}

            {/* Similar Businesses */}
            <div className="pt-8">
              <SimilarBusinesses business={displayedBusiness} />
            </div>
          </div>

          {/* Sidebar (Right) - Sticky */}
          <aside className="lg:w-1/3 order-first lg:order-last">
            <BusinessSidebar business={displayedBusiness} settings={settings} />
          </aside>

        </div>
      </main>
    </div>
  );
}

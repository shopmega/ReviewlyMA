import { getBusinessById, getFilteredBusinesses, getSiteSettings } from '@/lib/data';
import { LazyBusinessHero, LazyReviewsSection, LazyPhotoGallery } from '@/components/shared/performance';
import { AnalyticsTracker } from '@/components/shared/AnalyticsTracker';
import { BusinessSidebar } from '@/components/business/BusinessSidebar';
import { BusinessPageActions } from '@/components/shared/BusinessPageActions';
import { AboutSection } from '@/components/business/AboutSection';
import { UpdatesSection } from '@/components/business/UpdatesSection';
import { SimilarBusinesses } from '@/components/business/SimilarBusinesses';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { Business } from '@/lib/types';
import { getServerSiteUrl } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ slug: string }>;
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
  const image = business.cover_url || business.logo?.imageUrl || '/images/og-default.jpg';
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

export default async function BusinessPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Fetch Data
  const business = await getBusinessById(slug);
  const settings = await getSiteSettings();

  if (!business) {
    notFound();
  }

  // JSON-LD Structured Data
  const siteUrl = getServerSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business.name,
    "description": business.description,
    "image": business.logo?.imageUrl,
    "telephone": business.phone,
    "url": `${siteUrl}/businesses/${business.id}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": business.city,
      "addressRegion": business.quartier,
      "streetAddress": business.location,
      "addressCountry": "MA"
    },
    "aggregateRating": business.overallRating > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": business.overallRating,
      "reviewCount": business.reviews?.length || 0,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined,
    "review": business.reviews?.slice(0, 5).map(r => ({
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
      <AnalyticsTracker businessId={business.id} />

      {/* Hero Section */}
      <LazyBusinessHero business={business} />

      {/* Dedicated actions section to avoid hero overflow on mobile */}
      <section className="w-full border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <BusinessPageActions business={business} isFollowing={isFollowing} />
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Content (Left) */}
          <div className="lg:w-2/3 space-y-12 order-last lg:order-first">
            <AboutSection business={business} />
            <LazyPhotoGallery photos={business.photos} businessName={business.name} businessId={business.id} />

            {business.updates && business.updates.length > 0 && (
              <UpdatesSection updates={business.updates} />
            )}

            <LazyReviewsSection business={business} />

            {/* Similar Businesses */}
            <div className="pt-8">
              <SimilarBusinesses business={business} />
            </div>
          </div>

          {/* Sidebar (Right) - Sticky */}
          <aside className="lg:w-1/3 order-first lg:order-last">
            <BusinessSidebar business={business} settings={settings} />
          </aside>

        </div>
      </main>
    </div>
  );
}

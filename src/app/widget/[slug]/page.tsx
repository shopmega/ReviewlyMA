import { getBusinessById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { BusinessWidget } from '@/components/shared/BusinessWidget';

export type WidgetPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function WidgetPage({ params, searchParams }: WidgetPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const business = await getBusinessById(resolvedParams.slug);

  if (!business) {
    notFound();
  }

  // Parse customization options from query parameters
  const theme = resolvedSearchParams.theme === 'dark' ? 'dark' : 'light';
  const showName = resolvedSearchParams.hideName !== 'true';
  const showCategory = resolvedSearchParams.hideCategory !== 'true';
  const showLocation = resolvedSearchParams.hideLocation !== 'true';
  const showRating = resolvedSearchParams.hideRating !== 'true';
  const showReviewsCount = resolvedSearchParams.hideReviewsCount !== 'true';
  const showHours = resolvedSearchParams.hideHours !== 'true';
  const showCtaButton = resolvedSearchParams.hideCta !== 'true';

  return (
    <div className="p-4 bg-transparent">
        <BusinessWidget 
          business={business} 
          theme={theme}
          showName={showName}
          showCategory={showCategory}
          showLocation={showLocation}
          showRating={showRating}
          showReviewsCount={showReviewsCount}
          showHours={showHours}
          showCtaButton={showCtaButton}
        />
    </div>
  );
}

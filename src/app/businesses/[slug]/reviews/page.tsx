import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { getBusinessBySlug } from '@/lib/data/businesses';
import { getServerSiteUrl } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const siteUrl = getServerSiteUrl();

  if (!business) return {};

  return {
    title: `Avis ${business.name} | Reviewly`,
    description: `Consultez les avis anonymes pour ${business.name}.`,
    alternates: {
      canonical: `${siteUrl}/businesses/${business.id}?tab=reviews`,
    },
  };
}

export default async function BusinessReviewsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    permanentRedirect('/businesses');
  }

  const sp = await searchParams;
  const reviewId = toParam(sp.reviewId);
  const next = new URLSearchParams({ tab: 'reviews' });
  if (reviewId) next.set('reviewId', reviewId);

  permanentRedirect(`/businesses/${business.id}?${next.toString()}#insights`);
}

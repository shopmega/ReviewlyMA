import { notFound } from 'next/navigation';
import { getBusinessBySlug } from '@/lib/data/businesses';
import { ReviewsPageClient } from '@/components/business/ReviewsPageClient';
import { Metadata } from 'next';
import { getServerTranslator } from '@/lib/i18n/server';
import { getServerSiteUrl } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function sanitizeReviewSnippet(value: string) {
  const normalized = value
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Extrait d avis employe anonymise.';
  return normalized.slice(0, 180);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const business = await getBusinessBySlug(slug);
  const { tf } = await getServerTranslator();
  const siteUrl = getServerSiteUrl();

  if (!business) return {};

  const reviewIdRaw = toParam(sp.reviewId);
  const reviewId = Number.parseInt(reviewIdRaw, 10);
  const review = Number.isFinite(reviewId)
    ? business.reviews?.find((item) => item.id === reviewId)
    : null;

  const title = tf('business.reviews.metaTitle', 'Avis {name} - Tous les commentaires employes | Reviewly', { name: business.name });
  const description = tf(
    'business.reviews.metaDescription',
    'Decouvrez tous les avis anonymes des employes de {name} a {city}. Salaires, management et ambiance de travail.',
    { name: business.name, city: business.city || '' }
  );

  const canonical = `${siteUrl}/businesses/${business.id}/reviews`;

  if (!review) {
    return {
      title,
      description,
      alternates: { canonical },
    };
  }

  const snippet = sanitizeReviewSnippet(review.text);
  const ogQuery = new URLSearchParams({
    company: business.name || '',
    city: business.city || '',
    rating: String(review.rating || 0),
    snippet,
  });
  const image = `${siteUrl}/api/og/review-snippet?${ogQuery.toString()}`;

  return {
    title,
    description: `Extrait d avis: "${snippet}"`,
    alternates: { canonical },
    openGraph: {
      title,
      description: `Extrait d avis: "${snippet}"`,
      type: 'website',
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: 'Extrait d avis employe' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Extrait d avis: "${snippet}"`,
      images: [image],
    },
  };
}

export default async function BusinessReviewsPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  return <ReviewsPageClient business={business} />;
}

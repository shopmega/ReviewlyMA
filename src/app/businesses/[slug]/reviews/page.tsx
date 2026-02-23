import { notFound } from 'next/navigation';
import { getBusinessBySlug } from '@/lib/data/businesses';
import { ReviewsPageClient } from '@/components/business/ReviewsPageClient';
import { Metadata } from 'next';
import { getServerTranslator } from '@/lib/i18n/server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const { tf } = await getServerTranslator();

  if (!business) return {};

  return {
    title: tf('business.reviews.metaTitle', 'Avis {name} - Tous les commentaires employes | Reviewly', { name: business.name }),
    description: tf(
      'business.reviews.metaDescription',
      'Decouvrez tous les avis anonymes des employes de {name} a {city}. Salaires, management et ambiance de travail.',
      { name: business.name, city: business.city || '' }
    ),
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

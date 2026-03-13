import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { getBusinessBySlug } from '@/lib/data/businesses';
import { getServerSiteUrl } from '@/lib/site-config';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const siteUrl = getServerSiteUrl();

  if (!business) {
    return {
      title: 'Salaires entreprise introuvable',
    };
  }

  return {
    title: `Salaires chez ${business.name} | Reviewly`,
    description: `Consultez les salaires anonymises publies pour ${business.name}.`,
    alternates: {
      canonical: `${siteUrl}/businesses/${business.id}?tab=salaries`,
    },
  };
}

export default async function BusinessSalariesPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    permanentRedirect('/businesses');
  }

  permanentRedirect(`/businesses/${business.id}?tab=salaries#salaries`);
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type SearchParams = { [key: string]: string | string[] | undefined };

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Demandes de parrainage | Reviewly MA',
    description: 'Redirection vers le marketplace unifie des parrainages.',
    alternates: { canonical: '/parrainages?kind=demands' },
  };
}

const getParam = (params: SearchParams, key: string) => {
  const value = params[key];
  if (typeof value !== 'string') return '';
  return value.trim();
};

export default async function ReferralDemandBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  query.set('kind', 'demands');

  const search = getParam(params, 'search');
  const city = getParam(params, 'city');
  if (search) query.set('search', search);
  if (city) query.set('city', city);

  redirect(`/parrainages?${query.toString()}`);
}

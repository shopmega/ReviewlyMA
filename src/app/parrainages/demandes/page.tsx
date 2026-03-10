import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerTranslator } from '@/lib/i18n/server';

type SearchParams = { [key: string]: string | string[] | undefined };

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('referralDemandBoardPage.metaTitle', 'Referral requests | Reviewly MA'),
    description: t(
      'referralDemandBoardPage.metaDescription',
      'Browse public requests from candidates looking for a referral.'
    ),
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

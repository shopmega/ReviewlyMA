import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCityFromSlug } from '@/lib/utils';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { citySlug: string };

type ReferralOffer = {
  id: string;
  company_name: string;
  job_title: string;
  city: string | null;
  slots: number;
  created_at: string;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { citySlug } = await params;
  const city = getCityFromSlug(citySlug) || citySlug;
  return {
    title: tf('referralCityPage.metaTitle', 'Referrals in {city} | Reviewly MA', { city }),
    description: tf('referralCityPage.metaDescription', 'Active internal referral offers in {city} on Reviewly MA.', { city }),
    alternates: { canonical: `/parrainages/ville/${citySlug}` },
  };
}

export default async function ReferralCityPage({ params }: { params: Promise<Params> }) {
  const { t, tf, locale } = await getServerTranslator();
  const dateLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const { citySlug } = await params;
  const city = getCityFromSlug(citySlug);
  if (!city) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, job_title, city, slots, created_at')
    .eq('status', 'active')
    .ilike('city', city)
    .order('created_at', { ascending: false })
    .limit(80);

  const offers = (data || []) as ReferralOffer[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">{tf('referralCityPage.title', 'Referrals in {city}', { city })}</h1>
        <p className="text-sm text-muted-foreground">{tf('referralCityPage.activeCount', '{count} active offer(s)', { count: offers.length })}</p>
      </div>

      <InternalAdsSlot placement="referrals_top_banner" />

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('referralCityPage.empty', 'No active offer for this city.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <Badge variant="outline">{offer.company_name}</Badge>
                <CardTitle className="text-xl">{offer.job_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{tf('referralCityPage.slots', 'Slots: {count}', { count: offer.slots })}</p>
                <p>
                  {tf('referralCityPage.publishedOn', 'Published on {date}', {
                    date: new Date(offer.created_at).toLocaleDateString(dateLocale),
                  })}
                </p>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={`/parrainages/${offer.id}`}>{t('referralCityPage.viewOffer', 'View offer')}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}

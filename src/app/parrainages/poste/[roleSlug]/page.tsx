import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { roleSlug: string };

type ReferralOffer = {
  id: string;
  company_name: string;
  job_title: string;
  city: string | null;
  slots: number;
  created_at: string;
};

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  summary: string;
  created_at: string;
};

type MarketItem =
  | { type: 'offer'; created_at: string; offer: ReferralOffer }
  | { type: 'demand'; created_at: string; demand: DemandListing };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { roleSlug } = await params;
  return {
    title: tf('referralRolePage.metaTitle', 'Referrals role | {role} | Reviewly', { role: roleSlug }),
    description: tf('referralRolePage.metaDescription', 'Active referral offers for role {role} on Reviewly.', { role: roleSlug }),
    alternates: { canonical: `/parrainages/poste/${roleSlug}` },
  };
}

export default async function ReferralRolePage({ params }: { params: Promise<Params> }) {
  const { t, tf } = await getServerTranslator();
  const { roleSlug } = await params;
  const supabase = await createClient();
  const { data: offersData } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, job_title, city, slots, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(250);

  const offers = ((offersData || []) as ReferralOffer[]).filter((offer) => slugify(offer.job_title) === roleSlug);
  const roleTitle = offers[0]?.job_title || roleSlug;
  const roleKeyword = roleTitle === roleSlug ? roleSlug.replace(/-/g, ' ') : roleTitle;

  const { data: demandsData } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, summary, created_at')
    .eq('status', 'active')
    .ilike('target_role', roleKeyword)
    .order('created_at', { ascending: false })
    .limit(250);

  const demands = (demandsData || []) as DemandListing[];
  const marketItems: MarketItem[] = [
    ...offers.map((offer) => ({ type: 'offer' as const, created_at: offer.created_at, offer })),
    ...demands.map((demand) => ({ type: 'demand' as const, created_at: demand.created_at, demand })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">{tf('referralRolePage.title', 'Referrals for {role}', { role: roleTitle })}</h1>
        <p className="text-sm text-muted-foreground">
          {marketItems.length} item(s): {offers.length} offre(s), {demands.length} demande(s)
        </p>
      </div>

      <InternalAdsSlot placement="referrals_top_banner" />

      {marketItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune offre ni demande active pour ce poste.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {marketItems.map((item) =>
            item.type === 'offer' ? (
              <Card key={`offer-${item.offer.id}`} className="rounded-2xl">
                <CardHeader className="space-y-2">
                  <Badge variant="outline">{item.offer.company_name}</Badge>
                  <CardTitle className="text-xl">{item.offer.job_title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{item.offer.city || t('referralRolePage.cityUnknown', 'City not specified')}</p>
                  <p>{tf('referralRolePage.slots', 'Slots: {count}', { count: item.offer.slots })}</p>
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={`/parrainages/${item.offer.id}`}>{t('referralRolePage.viewOffer', 'View offer')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card key={`demand-${item.demand.id}`} className="rounded-2xl">
                <CardHeader className="space-y-2">
                  <Badge variant="secondary">Demande</Badge>
                  <CardTitle className="text-xl">{item.demand.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{item.demand.target_role}</p>
                  <p>{item.demand.city || t('referralRolePage.cityUnknown', 'City not specified')}</p>
                  <p className="line-clamp-3">{item.demand.summary}</p>
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={`/parrainages/demandes/${item.demand.id}`}>Voir la demande</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}

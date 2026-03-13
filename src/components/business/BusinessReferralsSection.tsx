'use client';

import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, MessageSquareText, Plus, Users } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReferralDemandSummary, ReferralOfferSummary } from '@/lib/types';

type BusinessReferralsSectionProps = {
  businessId: string;
  businessName: string;
  offers: ReferralOfferSummary[];
  demands: ReferralDemandSummary[];
};

export function BusinessReferralsSection({
  businessId,
  businessName,
  offers,
  demands,
}: BusinessReferralsSectionProps) {
  const { t, tf, locale } = useI18n();
  const marketplaceHref = `/parrainages?search=${encodeURIComponent(businessName)}`;

  return (
    <section id="referrals" className="space-y-6">
      <Card className="border border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit">
                <Users className="mr-1 h-3.5 w-3.5" />
                {t('business.referrals.badge', 'Connections')}
              </Badge>
              <CardTitle className="text-xl">
                {tf('business.referrals.title', 'Referral activity for {name}', { name: businessName })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t(
                  'business.referrals.description',
                  'Offers and public demand signals for this employer are grouped here so discovery, evaluation, and connection stay in one place.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={marketplaceHref}>
                  {t('business.referrals.openMarketplace', 'Open marketplace')}
                </Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={`/parrainages/new?type=offer&businessId=${businessId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('business.referrals.publishOffer', 'Publish offer')}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">{t('business.referrals.activeOffers', 'Active offers')}</p>
              <p className="mt-1 text-2xl font-bold">{offers.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs text-muted-foreground">{t('business.referrals.publicDemand', 'Public demand mentions')}</p>
              <p className="mt-1 text-2xl font-bold">{demands.length}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {offers.length === 0 && demands.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                'business.referrals.empty',
                'No active referral offers or public demand mentions are linked to this business yet.'
              )}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={marketplaceHref}>{t('business.referrals.browseMarket', 'Browse referrals')}</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={`/parrainages/new?type=demand`}>
                  {t('business.referrals.createDemand', 'Create demand')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BriefcaseBusiness className="h-5 w-5 text-primary" />
                {t('business.referrals.offerList', 'Referral offers')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('business.referrals.noOffers', 'No active offers for this employer right now.')}
                </p>
              ) : (
                offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{offer.job_title}</p>
                      <Badge variant="secondary">
                        {tf('business.referrals.slots', '{count} slots', { count: offer.slots })}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {offer.city || t('business.referrals.cityUnknown', 'City not specified')} -{' '}
                      {new Date(offer.created_at).toLocaleDateString(locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US')}
                    </p>
                    <Button asChild variant="link" className="mt-2 h-auto p-0 text-primary">
                      <Link href={`/parrainages/${offer.id}`}>
                        {t('business.referrals.viewOffer', 'View offer')}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquareText className="h-5 w-5 text-primary" />
                {t('business.referrals.demandList', 'Public demand mentions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {demands.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('business.referrals.noDemands', 'No public demand mentions for this employer yet.')}
                </p>
              ) : (
                demands.map((demand) => (
                  <div key={demand.id} className="rounded-xl border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{demand.title}</p>
                      <Badge variant="outline">{demand.target_role}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {demand.city || t('business.referrals.cityUnknown', 'City not specified')} -{' '}
                      {new Date(demand.created_at).toLocaleDateString(locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US')}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{demand.summary}</p>
                    <Button asChild variant="link" className="mt-2 h-auto p-0 text-primary">
                      <Link href={`/parrainages/demandes/${demand.id}`}>
                        {t('business.referrals.viewDemand', 'View demand')}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

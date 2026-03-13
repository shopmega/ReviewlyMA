import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock3, MapPin } from 'lucide-react';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { ContentShareButton } from '@/components/shared/ContentShareButton';
import { getServerSiteUrl } from '@/lib/site-config';
import { DemandResponseForm } from './DemandResponseForm';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { id: string };

type DemandListing = {
  id: string;
  user_id: string;
  title: string;
  target_role: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  summary: string;
  details: string | null;
  expires_at: string | null;
  created_at: string;
  status: string;
};

type DemandResponse = {
  id: string;
  demand_listing_id: string;
  responder_user_id: string;
  message: string;
  referral_offer_id: string | null;
  status: string;
  created_at: string;
};

type LinkedOffer = {
  id: string;
  company_name: string;
  job_title: string;
};

export const dynamic = 'force-dynamic';

async function getDemandListingById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, user_id, title, target_role, city, contract_type, work_mode, seniority, summary, details, expires_at, created_at, status')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  return (data as DemandListing | null) || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { id } = await params;
  const siteUrl = getServerSiteUrl();
  const item = await getDemandListingById(id);
  if (!item) {
    return {
      title: t('referralDemandDetailPage.metadata.notFoundTitle', 'Referral demand | Reviewly'),
      alternates: { canonical: `${siteUrl}/parrainages/demandes/${id}` },
    };
  }

  const citySuffix = item.city ? ` - ${item.city}` : '';
  const title = tf(
    'referralDemandDetailPage.metadata.title',
    '{role}{citySuffix} | Referral demand',
    { role: item.target_role, citySuffix }
  );
  const description = tf(
    'referralDemandDetailPage.metadata.description',
    'Public referral demand for {role}{citySuffix}. Data is anonymized and moderated.',
    { role: item.target_role, citySuffix }
  );
  const ogQuery = new URLSearchParams({
    role: item.target_role,
    city: item.city || '',
    title: item.title,
  });
  const canonical = `${siteUrl}/parrainages/demandes/${item.id}`;
  const image = `${siteUrl}/api/og/referral-demand?${ogQuery.toString()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{
        url: image,
        width: 1200,
        height: 630,
        alt: t('referralDemandDetailPage.metadata.ogAlt', 'Referral demand'),
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ReferralDemandDetailPage({ params }: { params: Promise<Params> }) {
  const { t, tf, locale } = await getServerTranslator();
  const dateLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const { id } = await params;
  const siteUrl = getServerSiteUrl();
  const item = await getDemandListingById(id);
  if (!item) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth.user?.id ?? null;
  const isOwner = currentUserId === item.user_id;

  let existingResponse: { id: string; status: string } | null = null;
  if (currentUserId && !isOwner) {
    const { data } = await supabase
      .from('job_referral_demand_responses')
      .select('id, status')
      .eq('demand_listing_id', item.id)
      .eq('responder_user_id', currentUserId)
      .eq('status', 'active')
      .maybeSingle();
    existingResponse = (data as { id: string; status: string } | null) || null;
  }

  let ownerResponses: DemandResponse[] = [];
  let offerMap = new Map<string, LinkedOffer>();
  if (isOwner) {
    const { data } = await supabase
      .from('job_referral_demand_responses')
      .select('id, demand_listing_id, responder_user_id, message, referral_offer_id, status, created_at')
      .eq('demand_listing_id', item.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    ownerResponses = (data || []) as DemandResponse[];
    const linkedOfferIds = [...new Set(ownerResponses.map((response) => response.referral_offer_id).filter(Boolean))] as string[];

    if (linkedOfferIds.length > 0) {
      const { data: offers } = await supabase
        .from('job_referral_offers')
        .select('id, company_name, job_title')
        .in('id', linkedOfferIds);
      offerMap = new Map((offers || []).map((offer) => [offer.id, offer as LinkedOffer]));
    }
  }

  const demandShareUrl = `${siteUrl}/parrainages/demandes/${item.id}`;
  const demandShareText = tf(
    'referralDemandDetailPage.share.text',
    'Referral demand: {role}{cityPart}.',
    { role: item.target_role, cityPart: item.city ? tf('referralDemandDetailPage.share.cityPart', ' in {city}', { city: item.city }) : '' }
  );
  const respondLoginHref = `/login?next=${encodeURIComponent(`/parrainages/demandes/${item.id}#respond-form`)}`;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Link href="/parrainages?kind=demands" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {t('referralDemandDetailPage.actions.backToBoard', 'Back to board')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{item.target_role}</Badge>
          {item.city && (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.city}
            </Badge>
          )}
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {new Date(item.created_at).toLocaleDateString(dateLocale)}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold font-headline">{item.title}</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold mb-2">{t('referralDemandDetailPage.sections.summary', 'Summary')}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.summary}</p>
            </div>
            {item.details && (
              <div>
                <h2 className="font-semibold mb-2">{t('referralDemandDetailPage.sections.details', 'Details')}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.details}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <InternalAdsSlot placement="referrals_detail_sidebar" limit={1} />
          <Card className="rounded-2xl">
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-3">
              <p>{t('referralDemandDetailPage.sidebar.description', 'Reply here to propose a referral and centralize exchanges.')}</p>
              <ContentShareButton
                url={demandShareUrl}
                title={tf('referralDemandDetailPage.share.title', 'Referral demand: {role}', { role: item.target_role })}
                text={demandShareText}
                contentType="referral_demand"
                contentId={item.id}
                cardType="referral_demand_snapshot"
                className="w-full rounded-xl"
              />
              <Button asChild className="w-full rounded-xl">
                <Link href="/parrainages/new?type=demand">{t('referralDemandDetailPage.actions.publishDemand', 'Publish your demand')}</Link>
              </Button>
            </CardContent>
          </Card>

          {!currentUserId ? (
            <Button asChild className="w-full rounded-xl">
              <Link href={respondLoginHref}>
                {t('referralDemandDetailPage.authPrompt.label', 'Log in to reply')}
              </Link>
            </Button>
          ) : null}

          {currentUserId && !isOwner ? (
            <DemandResponseForm demandListingId={item.id} existingResponse={existingResponse} />
          ) : null}

          {isOwner ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 space-y-3">
                <h2 className="text-sm font-semibold">
                  {tf('referralDemandDetailPage.owner.responsesTitle', 'Received responses ({count})', {
                    count: ownerResponses.length,
                  })}
                </h2>
                {ownerResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('referralDemandDetailPage.owner.noResponses', 'No responses yet.')}</p>
                ) : (
                  <div className="space-y-3">
                    {ownerResponses.slice(0, 8).map((response) => {
                      const linkedOffer = response.referral_offer_id ? offerMap.get(response.referral_offer_id) : null;
                      return (
                        <div key={response.id} className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link href={`/users/${response.responder_user_id}`} className="text-sm font-semibold text-primary hover:underline">
                              {tf('referralDemandDetailPage.owner.candidateLabel', 'Candidate {id}...', {
                                id: response.responder_user_id.slice(0, 8),
                              })}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {new Date(response.created_at).toLocaleDateString(dateLocale)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{response.message}</p>
                          {linkedOffer ? (
                            <p className="text-xs text-muted-foreground">
                              {t('referralDemandDetailPage.owner.linkedOfferLabel', 'Linked offer:')}{' '}
                              <Link href={`/parrainages/${linkedOffer.id}`} className="text-primary hover:underline">
                                {linkedOffer.job_title} - {linkedOffer.company_name}
                              </Link>
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                    {ownerResponses.length > 8 ? (
                      <p className="text-xs text-muted-foreground">
                        {tf(
                          'referralDemandDetailPage.owner.hiddenResponses',
                          '{count} additional response(s) not displayed.',
                          { count: ownerResponses.length - 8 }
                        )}
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

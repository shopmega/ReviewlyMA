import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, Clock3, ShieldCheck, TrendingUp, Users2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { slugify } from '@/lib/utils';
import {
  ENABLE_COMPANY_ROUTE_INDEXING,
  MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS,
  PREFER_NEW_COMPANY_ROUTE_CANONICAL,
} from '@/lib/seo-ia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { company: string };

type CompanyReferralOffer = {
  id: string;
  company_name: string;
  business_id: string | null;
  job_title: string;
  city: string | null;
  slots: number;
  trust_score: number | null;
  created_at: string;
  expires_at: string | null;
};

const MAX_FETCH = 800;
const MIN_SENTIMENT_SAMPLE_SIZE = 5;

const displayFromSlug = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

function isNotExpired(expiresAt: string | null) {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts > Date.now();
}

async function fetchCompanyOffers(companySlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_referral_offers')
    .select('id, company_name, business_id, job_title, city, slots, trust_score, created_at, expires_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(MAX_FETCH);

  const rows = (data || []) as CompanyReferralOffer[];
  return rows.filter((offer) => slugify(offer.company_name) === companySlug && isNotExpired(offer.expires_at));
}

function isMissingColumnError(error: any, columnName: string): boolean {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes(columnName.toLowerCase())
    || message.includes('schema cache')
    || String(error.code || '') === '42703'
  );
}

type ReviewSentimentRow = {
  rating: number;
  would_recommend?: boolean | null;
  created_at?: string | null;
  date?: string | null;
};

async function fetchCompanyReviewRows(businessIds: string[]) {
  if (businessIds.length === 0) return [] as ReviewSentimentRow[];

  const supabase = await createClient();
  const primary = await supabase
    .from('reviews')
    .select('rating, would_recommend, created_at, date')
    .eq('status', 'published')
    .in('business_id', businessIds)
    .limit(5000);

  if (!primary.error) {
    return (primary.data || []) as ReviewSentimentRow[];
  }

  if (!isMissingColumnError(primary.error, 'would_recommend')) {
    return [];
  }

  const fallback = await supabase
    .from('reviews')
    .select('rating, created_at, date')
    .eq('status', 'published')
    .in('business_id', businessIds)
    .limit(5000);

  return (fallback.data || []) as ReviewSentimentRow[];
}

function getReviewTimestamp(row: ReviewSentimentRow) {
  if (row.created_at) {
    const ts = Date.parse(row.created_at);
    if (!Number.isNaN(ts)) return ts;
  }
  if (row.date) {
    const ts = Date.parse(row.date);
    if (!Number.isNaN(ts)) return ts;
  }
  return NaN;
}

function calculateCompanySentiment(rows: ReviewSentimentRow[]) {
  if (rows.length === 0) {
    return {
      sampleSize: 0,
      averageRating: null as number | null,
      positiveSharePct: null as number | null,
      recommendRatePct: null as number | null,
      last90Count: 0,
      previous90Count: 0,
      momentumPct: null as number | null,
      hasEnoughSample: false,
    };
  }

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const currentStart = now - ninetyDaysMs;
  const previousStart = now - ninetyDaysMs * 2;

  let ratingTotal = 0;
  let positiveCount = 0;
  let recommendYes = 0;
  let recommendAnswered = 0;
  let last90Count = 0;
  let previous90Count = 0;

  for (const row of rows) {
    ratingTotal += row.rating;
    if (row.rating >= 4) positiveCount += 1;
    if (typeof row.would_recommend === 'boolean') {
      recommendAnswered += 1;
      if (row.would_recommend) recommendYes += 1;
    }

    const ts = getReviewTimestamp(row);
    if (Number.isNaN(ts)) continue;
    if (ts >= currentStart) {
      last90Count += 1;
      continue;
    }
    if (ts >= previousStart && ts < currentStart) {
      previous90Count += 1;
    }
  }

  const momentumPct =
    previous90Count === 0
      ? (last90Count > 0 ? 100 : 0)
      : Math.round(((last90Count - previous90Count) / previous90Count) * 100);

  return {
    sampleSize: rows.length,
    averageRating: Number((ratingTotal / rows.length).toFixed(2)),
    positiveSharePct: Number(((positiveCount / rows.length) * 100).toFixed(1)),
    recommendRatePct:
      recommendAnswered > 0
        ? Number(((recommendYes / recommendAnswered) * 100).toFixed(1))
        : null,
    last90Count,
    previous90Count,
    momentumPct,
    hasEnoughSample: rows.length >= MIN_SENTIMENT_SAMPLE_SIZE,
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { company } = await params;
  const offers = await fetchCompanyOffers(company);
  const companyLabel = offers[0]?.company_name || displayFromSlug(company);
  const hasEnoughData = offers.length >= MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS;
  const shouldIndex = ENABLE_COMPANY_ROUTE_INDEXING && hasEnoughData;
  const siteUrl = getServerSiteUrl();
  const canonicalLegacy = `${siteUrl}/parrainages/entreprise/${company}`;
  const canonicalNew = `${siteUrl}/companies/${company}/referrals`;
  const canonicalTarget = PREFER_NEW_COMPANY_ROUTE_CANONICAL ? canonicalNew : canonicalLegacy;

  return {
    title: tf('companyReferralsPage.metaTitle', '{company} referrals | Reviewly', { company: companyLabel }),
    description: tf(
      'companyReferralsPage.metaDescription',
      'Active referral offers for {company}, including role, city, trust, and review sentiment signals.',
      { company: companyLabel }
    ),
    alternates: {
      canonical: canonicalTarget,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

export default async function CompanyReferralsPage({ params }: { params: Promise<Params> }) {
  const { locale, t, tf } = await getServerTranslator();
  const { company } = await params;
  const offers = await fetchCompanyOffers(company);
  if (offers.length === 0) {
    notFound();
  }

  const companyLabel = offers[0]?.company_name || displayFromSlug(company);
  const hasEnoughData = offers.length >= MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS;
  const shouldIndex = ENABLE_COMPANY_ROUTE_INDEXING && hasEnoughData;
  const canonicalPath = PREFER_NEW_COMPANY_ROUTE_CANONICAL
    ? `/companies/${company}/referrals`
    : `/parrainages/entreprise/${company}`;
  const avgTrustScore = offers.reduce((sum, row) => sum + (row.trust_score || 0), 0) / offers.length;
  const businessIds = [...new Set(offers.map((offer) => offer.business_id).filter((value): value is string => !!value))];
  const reviewRows = await fetchCompanyReviewRows(businessIds);
  const sentiment = calculateCompanySentiment(reviewRows);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">{t('companyReferralsPage.badge', 'Company referrals')}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">
          {tf('companyReferralsPage.title', 'Referrals at {company}', { company: companyLabel })}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {tf('companyReferralsPage.activeOffersSentence', '{count} active offers currently available for this company.', { count: offers.length })}
        </p>
        {!shouldIndex && (
          <p className="text-xs text-muted-foreground">
            {t('companyReferralsPage.noindexNotice', 'This page remains noindex until the route cutover flags are enabled.')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={canonicalPath}>{t('companyReferralsPage.openCanonical', 'Open canonical company page')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/companies">{t('companyReferralsPage.backToHub', 'Back to company hub')}</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {t('companyReferralsPage.activeOffers', 'Active offers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{offers.length}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              {t('companyReferralsPage.avgTrustScore', 'Average trust score')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{Number.isFinite(avgTrustScore) ? Math.round(avgTrustScore) : 0}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              {t('companyReferralsPage.thresholdStatus', 'Threshold status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {hasEnoughData
              ? tf('companyReferralsPage.thresholdPassed', 'Passes data threshold ({count}+ offers).', { count: MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS })
              : tf('companyReferralsPage.thresholdRemaining', 'Needs {count} more offers to pass threshold.', { count: MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS - offers.length })}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Users2 className="h-4 w-4" />
              {t('companyReferralsPage.reviewSample', 'Review sample')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{sentiment.sampleSize}</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              {t('companyReferralsPage.avgRating', 'Average rating')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {sentiment.hasEnoughSample && sentiment.averageRating !== null ? `${sentiment.averageRating}/5` : t('companyReferralsPage.notAvailable', 'N/A')}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {t('companyReferralsPage.reviewMomentum', '90-day review momentum')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {sentiment.hasEnoughSample && sentiment.momentumPct !== null ? `${sentiment.momentumPct}%` : t('companyReferralsPage.notAvailable', 'N/A')}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{t('companyReferralsPage.sentimentTitle', 'Review sentiment summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {businessIds.length === 0 ? (
            <p>{t('companyReferralsPage.noBusinessIds', 'No linked business IDs were found on current offers, so review sentiment cannot be aggregated yet.')}</p>
          ) : !sentiment.hasEnoughSample ? (
            <p>
              {tf('companyReferralsPage.lowSampleNotice', 'Sentiment hidden due to low sample size. Minimum {count} published reviews required.', { count: MIN_SENTIMENT_SAMPLE_SIZE })}
            </p>
          ) : (
            <>
              <p>{t('companyReferralsPage.positiveShare', 'Positive share (ratings 4-5)')}: {sentiment.positiveSharePct}%</p>
              <p>{t('companyReferralsPage.recommendRate', 'Would-recommend rate')}: {sentiment.recommendRatePct ?? t('companyReferralsPage.notAvailable', 'N/A')}%</p>
              <p>
                {t('companyReferralsPage.last90Days', 'Published reviews last 90 days')}: {sentiment.last90Count}
                {' '}| {t('companyReferralsPage.previous90Days', 'previous 90 days')}: {sentiment.previous90Count}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{t('companyReferralsPage.latestOffers', 'Latest company offers')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{offer.job_title}</p>
                <p className="text-xs text-muted-foreground">
                  {offer.city || t('companyReferralsPage.cityUnavailable', 'City unavailable')} | {t('companyReferralsPage.slots', 'Slots')}: {offer.slots} | {new Date(offer.created_at).toLocaleDateString(locale === 'fr' ? 'fr-MA' : 'en-US')}
                </p>
              </div>
              <Button asChild variant="outline" className="w-fit">
                <Link href={`/parrainages/${offer.id}`} className="inline-flex items-center gap-2">
                  {t('companyReferralsPage.viewOffer', 'View offer')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

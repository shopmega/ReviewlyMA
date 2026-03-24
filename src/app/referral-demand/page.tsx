import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, MapPin, TrendingUp, Users2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { PageIntro } from '@/components/shared/PageIntro';
import { MetricCard } from '@/components/shared/MetricCard';
import { getServerTranslator } from '@/lib/i18n/server';

type DemandListingSnapshot = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  work_mode: string | null;
  seniority: string | null;
  created_at: string;
  expires_at: string | null;
};

const WINDOW_DAYS = 30;
const FETCH_LIMIT = 800;

function toDisplayValue(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function topBuckets(values: string[], limit = 6) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function getMonthWindowStats(createdAtValues: string[]) {
  const now = Date.now();
  const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const currentStart = now - windowMs;
  const previousStart = now - windowMs * 2;

  let current = 0;
  let previous = 0;

  for (const value of createdAtValues) {
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) continue;
    if (ts >= currentStart) {
      current += 1;
      continue;
    }
    if (ts >= previousStart && ts < currentStart) {
      previous += 1;
    }
  }

  const pctChange = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  return { current, previous, pctChange };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  const siteUrl = getServerSiteUrl();
  return {
    title: `${t('referralDemandPage.metaTitle', 'Referral demand dashboard')} | Reviewly`,
    description: t('referralDemandPage.metaDescription', 'Track live referral demand, top roles, top cities, and hiring momentum across the market.'),
    alternates: {
      canonical: `${siteUrl}/referral-demand`,
    },
  };
}

export default async function ReferralDemandDashboardPage() {
  const { locale, t, tf } = await getServerTranslator();
  const supabase = await createClient();
  const refreshedAt = new Date();

  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, work_mode, seniority, created_at, expires_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);

  const now = Date.now();
  const activeListings = ((data || []) as DemandListingSnapshot[]).filter((item) => {
    if (!item.expires_at) return true;
    const expiresAt = Date.parse(item.expires_at);
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt > now;
  });

  const topRoles = topBuckets(activeListings.map((item) => toDisplayValue(item.target_role, t('referralDemandPage.roleUnknown', 'Role not specified'))), 8);
  const topCities = topBuckets(activeListings.map((item) => toDisplayValue(item.city, t('referralDemandPage.cityUnknown', 'City not specified'))), 8);
  const topWorkModes = topBuckets(activeListings.map((item) => toDisplayValue(item.work_mode, t('referralDemandPage.modeUnknown', 'Work mode not specified'))), 3);
  const trend = getMonthWindowStats(activeListings.map((item) => item.created_at));
  const latest = activeListings.slice(0, 10);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <PageIntro
        badge={<Badge variant="outline" className="w-fit">{t('referralDemandPage.badge', 'Referral demand intelligence')}</Badge>}
        title={t('referralDemandPage.title', 'Live referral demand dashboard')}
        description={t('referralDemandPage.description', 'Track where referral demand is growing, which roles are requested most often, and which cities are moving right now. Use these signals alongside salary guides and company reviews to target your next application.')}
        meta={<p className="text-xs text-muted-foreground">{tf('referralDemandPage.lastRefreshed', 'Last refreshed: {date}', { date: refreshedAt.toLocaleString(locale === 'fr' ? 'fr-MA' : 'en-US') })}</p>}
        actions={
          <>
            <Button asChild className="rounded-xl">
              <Link href="/parrainages/demandes">{t('referralDemandPage.viewDemandBoard', 'View the demand board')}</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-xl">
              <Link href="/referral-demand/roles">Top roles</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-xl">
              <Link href="/referral-demand/cities">Top cities</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/parrainages/demandes/new">{t('referralDemandPage.publishDemand', 'Publish a demand listing')}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/parrainages">{t('referralDemandPage.viewReferralOffers', 'View referral offers')}</Link>
            </Button>
          </>
        }
      />

      <InternalAdsSlot placement="referrals_top_banner" />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title={t('referralDemandPage.activeListings', 'Active listings')} value={String(activeListings.length)} icon={Users2} />
        <MetricCard title={`Last ${WINDOW_DAYS} days`} value={String(trend.current)} icon={TrendingUp} />
        <MetricCard title="Change vs previous" value={`${trend.pctChange}%`} icon={BarChart3} />
        <MetricCard
          title="Top work mode"
          value={topWorkModes[0] ? `${topWorkModes[0].label} (${topWorkModes[0].count})` : 'N/A'}
          icon={Building2}
          valueClassName="text-xl font-semibold"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{t('referralDemandPage.topRoles', 'Top roles')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('referralDemandPage.noData', 'No data available.')}</p>
            ) : (
              topRoles.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{t('referralDemandPage.topCities', 'Top cities')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('referralDemandPage.noData', 'No data available.')}</p>
            ) : (
              topCities.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{t('referralDemandPage.latestDemandListings', 'Latest demand listings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('referralDemandPage.noActiveDemand', 'No active demand listings right now.')}</p>
          ) : (
            latest.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {toDisplayValue(item.target_role, t('referralDemandPage.roleUnknown', 'Role not specified'))} | {toDisplayValue(item.city, t('referralDemandPage.cityUnknown', 'City not specified'))} |
                    {' '}{tf('referralDemandPage.publishedOn', 'Published on {date}', { date: new Date(item.created_at).toLocaleDateString(locale === 'fr' ? 'fr-MA' : 'en-US') })}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit rounded-lg">
                  <Link href={`/parrainages/demandes/${item.id}`} className="inline-flex items-center gap-2">
                    {t('referralDemandPage.viewDemand', 'View demand listing')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{t('referralDemandPage.relatedResearch', 'Related research')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/salaires">Salary intelligence</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/companies">Company insights</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog">Execution playbooks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">Monthly reports</Link>
          </Button>
        </CardContent>
      </Card>

      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}

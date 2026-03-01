import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3, BriefcaseBusiness, CalendarDays, LineChart, MapPin, Users2 } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { slugify } from '@/lib/utils';
import { MIN_INDEXABLE_MONTHLY_REPORT_RECORDS } from '@/lib/seo-ia';
import { formatReportMonthLabel, parseMonthlyReferralReportSlug } from '@/lib/report-period';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = { reportSlug: string };

type DemandRow = {
  target_role: string | null;
  city: string | null;
  created_at: string;
  status?: string | null;
};

type OfferRow = {
  company_name: string | null;
  job_title: string | null;
  city: string | null;
  created_at: string;
  status?: string | null;
};

type QueryClient = Awaited<ReturnType<typeof createClient>>;

async function getBestEffortClient(): Promise<{ client: QueryClient; usingServiceRole: boolean }> {
  try {
    const client = await createServiceClient();
    return { client, usingServiceRole: true };
  } catch {
    const client = await createClient();
    return { client, usingServiceRole: false };
  }
}

function topBuckets(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function normalizeBucketValue(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function getMomentumPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function fetchMonthlyReportData(reportSlug: string) {
  const parsed = parseMonthlyReferralReportSlug(reportSlug);
  if (!parsed) return null;

  const previousStart = new Date(Date.UTC(parsed.year, parsed.monthIndex - 1, 1)).toISOString();
  const { client, usingServiceRole } = await getBestEffortClient();

  let demandCurrentQuery = client
    .from('job_referral_demand_listings')
    .select('target_role, city, created_at, status')
    .gte('created_at', parsed.periodStartIso)
    .lt('created_at', parsed.periodEndIso);

  let demandPreviousQuery = client
    .from('job_referral_demand_listings')
    .select('target_role, city, created_at, status')
    .gte('created_at', previousStart)
    .lt('created_at', parsed.periodStartIso);

  let offerCurrentQuery = client
    .from('job_referral_offers')
    .select('company_name, job_title, city, created_at, status')
    .gte('created_at', parsed.periodStartIso)
    .lt('created_at', parsed.periodEndIso);

  if (!usingServiceRole) {
    demandCurrentQuery = demandCurrentQuery.eq('status', 'active');
    demandPreviousQuery = demandPreviousQuery.eq('status', 'active');
    offerCurrentQuery = offerCurrentQuery.eq('status', 'active');
  }

  const [{ data: demandCurrentData }, { data: demandPreviousData }, { data: offerCurrentData }] = await Promise.all([
    demandCurrentQuery.limit(3000),
    demandPreviousQuery.limit(3000),
    offerCurrentQuery.limit(3000),
  ]);

  const demandCurrent = (demandCurrentData || []) as DemandRow[];
  const demandPrevious = (demandPreviousData || []) as DemandRow[];
  const offerCurrent = (offerCurrentData || []) as OfferRow[];

  return {
    parsed,
    usingServiceRole,
    demandCurrent,
    demandPrevious,
    offerCurrent,
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { reportSlug } = await params;
  const parsed = parseMonthlyReferralReportSlug(reportSlug);
  if (!parsed) {
    return { title: 'Report | Reviewly MA' };
  }

  const monthLabel = formatReportMonthLabel(parsed.reportDateUtc);
  const siteUrl = getServerSiteUrl();

  return {
    title: `Monthly referral report: ${monthLabel} | Reviewly MA`,
    description: `Referral demand, top roles, top cities, and company offer signals for ${monthLabel}.`,
    alternates: { canonical: `${siteUrl}/reports/${reportSlug}` },
  };
}

export default async function MonthlyReferralReportPage({ params }: { params: Promise<Params> }) {
  const { reportSlug } = await params;
  const data = await fetchMonthlyReportData(reportSlug);
  if (!data) {
    notFound();
  }

  const { parsed, usingServiceRole, demandCurrent, demandPrevious, offerCurrent } = data;
  const monthLabel = formatReportMonthLabel(parsed.reportDateUtc);
  const totalRecords = demandCurrent.length + offerCurrent.length;
  const isIndexable = totalRecords >= MIN_INDEXABLE_MONTHLY_REPORT_RECORDS;

  const topDemandRoles = topBuckets(
    demandCurrent.map((row) => normalizeBucketValue(row.target_role, 'Role non specifie')),
    10
  );
  const topDemandCities = topBuckets(
    demandCurrent.map((row) => normalizeBucketValue(row.city, 'Ville non specifiee')),
    10
  );
  const topOfferCompanies = topBuckets(
    offerCurrent.map((row) => normalizeBucketValue(row.company_name, 'Entreprise non specifiee')),
    10
  );

  const demandMomentum = getMomentumPct(demandCurrent.length, demandPrevious.length);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Monthly Referral Report</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Monthly referral report: {monthLabel}</h1>
        <p className="text-muted-foreground max-w-3xl">
          Snapshot of referral demand and offer-side activity for this month. Data source mode:{' '}
          {usingServiceRole ? 'full historical (service role)' : 'public active scope'}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/referral-demand">Open referral-demand dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">Back to reports hub</Link>
          </Button>
        </div>
      </section>

      {!isIndexable ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Insufficient data for a full monthly report</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              This period currently has {totalRecords} records. A minimum of{' '}
              {MIN_INDEXABLE_MONTHLY_REPORT_RECORDS} records is required for a full report publication.
            </p>
            <p>
              This page remains accessible for internal navigation and will auto-populate once more demand and offer
              signals are available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Users2 className="h-4 w-4" />
                  New demand listings
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{demandCurrent.length}</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <BriefcaseBusiness className="h-4 w-4" />
                  New referral offers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{offerCurrent.length}</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  Demand momentum
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{demandMomentum}%</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Total records
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{totalRecords}</CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Top demand roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topDemandRoles.map((row) => {
                  const roleSlug = slugify(row.label);
                  const topCityForRole = topDemandCities[0]?.label;
                  const citySlug = topCityForRole ? slugify(topCityForRole) : null;
                  const targetHref = roleSlug && citySlug ? `/referral-demand/${roleSlug}/${citySlug}` : '/referral-demand';

                  return (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <Link href={targetHref} className="text-sm hover:underline">
                        {row.label}
                      </Link>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Top demand cities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topDemandCities.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {row.label}
                    </span>
                    <Badge variant="secondary">{row.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Top companies (offers)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topOfferCompanies.map((row) => {
                  const slug = slugify(row.label);
                  return (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <Link href={`/companies/${slug}/referrals`} className="text-sm hover:underline">
                        {row.label}
                      </Link>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Cluster navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/referral-demand">Referral demand intelligence</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/salary">Salary intelligence</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/companies">Company insights</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog">Execution playbooks</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

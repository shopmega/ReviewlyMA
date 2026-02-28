import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3, ChartNoAxesColumn, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-config';
import { slugify } from '@/lib/utils';
import {
  ENABLE_SALARY_ROUTE_INDEXING,
  MIN_INDEXABLE_SALARY_ROLE_CITY_SAMPLES,
  PREFER_NEW_SALARY_ROUTE_CANONICAL,
} from '@/lib/seo-ia';
import { hasSufficientSampleSize } from '@/lib/salary-policy';
import { getSalaryCityMetrics, getSalaryRoleCityMetrics } from '@/lib/data/salaries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = { role: string; city: string };

type SalaryMonthlyRoleSnapshot = {
  reportMonth: string;
  medianMonthlySalary: number | null;
  submissionCount: number;
};

type SalaryMonthlyRolePair = {
  job_title?: string;
  city_slug?: string;
  median_monthly_salary?: number | null;
  submission_count?: number;
};

const displayFromSlug = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('fr-MA')} MAD`;
}

function buildDistributionRows(min: number | null, median: number | null, max: number | null) {
  return [
    { label: 'Low', value: min },
    { label: 'Median', value: median },
    { label: 'High', value: max },
  ];
}

async function loadRoleCityMetric(roleSlug: string, citySlug: string) {
  const rows = await getSalaryRoleCityMetrics({ citySlug, limit: 350 });
  return rows.find((row) => slugify(row.job_title) === roleSlug) || null;
}

async function loadRoleCityTrendFromMonthlyReports(roleSlug: string, citySlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('salary_monthly_reports_public')
    .select('report_month, report_payload')
    .order('report_month', { ascending: false })
    .limit(2);

  const rows = (data || []) as Array<{ report_month: string; report_payload: any }>;
  const snapshots: SalaryMonthlyRoleSnapshot[] = [];

  for (const row of rows) {
    const payload = row.report_payload;
    const pairs = payload?.highlights?.top_role_city_pairs;
    if (!Array.isArray(pairs)) continue;

    const match = (pairs as SalaryMonthlyRolePair[]).find((pair) => {
      if (!pair?.job_title || !pair?.city_slug) return false;
      return slugify(pair.job_title) === roleSlug && pair.city_slug === citySlug;
    });

    if (!match) continue;

    snapshots.push({
      reportMonth: row.report_month,
      medianMonthlySalary: typeof match.median_monthly_salary === 'number' ? match.median_monthly_salary : null,
      submissionCount: typeof match.submission_count === 'number' ? match.submission_count : 0,
    });
  }

  const current = snapshots[0] || null;
  const previous = snapshots[1] || null;

  const deltaPct =
    current && previous && current.medianMonthlySalary && previous.medianMonthlySalary
      ? Number((((current.medianMonthlySalary - previous.medianMonthlySalary) / previous.medianMonthlySalary) * 100).toFixed(2))
      : null;

  return { current, previous, deltaPct };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { role, city } = await params;
  const metric = await loadRoleCityMetric(role, city);
  const siteUrl = getServerSiteUrl();
  const canonicalLegacy = `${siteUrl}/salaires/role/${role}/${city}`;
  const canonicalNew = `${siteUrl}/salary/${role}/${city}`;
  const canonicalTarget = PREFER_NEW_SALARY_ROUTE_CANONICAL ? canonicalNew : canonicalLegacy;

  if (!metric) {
    return {
      title: `Salary ${displayFromSlug(role)} in ${displayFromSlug(city)} | Reviewly MA`,
      description: 'Salary role/city page.',
      alternates: { canonical: canonicalTarget },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const hasDistribution =
    metric.min_monthly_salary !== null &&
    metric.median_monthly_salary !== null &&
    metric.max_monthly_salary !== null;
  const hasEnoughSamples = metric.submission_count >= MIN_INDEXABLE_SALARY_ROLE_CITY_SAMPLES;
  const shouldIndex = ENABLE_SALARY_ROUTE_INDEXING && hasDistribution && hasEnoughSamples;

  return {
    title: `Salary ${metric.job_title} in ${metric.city} | Reviewly MA`,
    description: `Salary intelligence for ${metric.job_title} in ${metric.city} with distribution and market context.`,
    alternates: { canonical: canonicalTarget },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

export default async function SalaryRoleCityIaPage({ params }: { params: Promise<Params> }) {
  const { role, city } = await params;
  const metric = await loadRoleCityMetric(role, city);
  if (!metric) {
    notFound();
  }

  const [cityMetrics, trend, auth] = await Promise.all([
    getSalaryCityMetrics(city),
    loadRoleCityTrendFromMonthlyReports(role, city),
    createClient().then((supabase) => supabase.auth.getUser()),
  ]);

  const isUnlocked = !!auth.data.user;
  const cityMetric = cityMetrics[0] || null;
  const hasEnoughPublicSamples = hasSufficientSampleSize(metric.submission_count);
  const hasEnoughIndexSamples = metric.submission_count >= MIN_INDEXABLE_SALARY_ROLE_CITY_SAMPLES;
  const hasDistribution =
    metric.min_monthly_salary !== null &&
    metric.median_monthly_salary !== null &&
    metric.max_monthly_salary !== null;
  const shouldIndex = ENABLE_SALARY_ROUTE_INDEXING && hasEnoughIndexSamples && hasDistribution;
  const canonicalPath = PREFER_NEW_SALARY_ROUTE_CANONICAL ? `/salary/${role}/${city}` : `/salaires/role/${role}/${city}`;
  const distribution = buildDistributionRows(
    metric.min_monthly_salary,
    metric.median_monthly_salary,
    metric.max_monthly_salary
  );

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Salary Intelligence Page</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">
          Salary {metric.job_title} in {metric.city}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {metric.submission_count} salary submission(s) contribute to this role/city view.
        </p>
        {!shouldIndex && (
          <p className="text-xs text-muted-foreground">
            Transitional SEO mode: indexing is gated until route cutover flags are enabled.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={canonicalPath}>Open canonical salary page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/salary">Back to salary hub</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Data quality
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {hasEnoughPublicSamples
              ? `Public-safe sample size reached (${metric.submission_count}).`
              : `Insufficient sample size (${metric.submission_count}).`}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {distribution.map((bucket) => (
              <p key={bucket.label}>
                {bucket.label}: {isUnlocked ? formatMoney(bucket.value) : 'Connectez-vous'}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ChartNoAxesColumn className="h-4 w-4" />
              Trend vs last report
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {trend.deltaPct === null ? (
              <p>Not available in the latest monthly snapshots.</p>
            ) : (
              <p>{trend.deltaPct}% median change vs previous report month.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Core metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Median: {isUnlocked ? formatMoney(metric.median_monthly_salary) : 'Connectez-vous'}</p>
          <p>Junior median: {isUnlocked ? formatMoney(metric.junior_median_monthly_salary) : 'Connectez-vous'}</p>
          <p>Senior+ median: {isUnlocked ? formatMoney(metric.senior_median_monthly_salary) : 'Connectez-vous'}</p>
          <p>Vs national role median: {metric.pct_vs_national_role_median ?? '-'}%</p>
          {cityMetric && (
            <p>
              City benchmark median: {isUnlocked ? formatMoney(cityMetric.median_monthly_salary) : 'Connectez-vous'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

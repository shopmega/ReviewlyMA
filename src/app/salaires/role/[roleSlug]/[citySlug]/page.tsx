import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { getServerSiteUrl } from '@/lib/site-config';
import { getSalaryCityMetrics, getSalaryRoleCityMetrics } from '@/lib/data/salaries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { getSalaryAlertSubscriptionStatus } from '@/app/actions/salary-alerts';
import { SalaryAlertToggleButton } from '@/components/salaries/SalaryAlertToggleButton';
import { CareerPathMatrix } from '@/components/salaries/CareerPathMatrix';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { roleSlug: string; citySlug: string };

function formatMoney(value: number | null | undefined, locale: string, currencyLabel: string) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString(locale)} ${currencyLabel}`;
}

function formatRefreshedDate(value: string | null | undefined, locale: string, unavailableLabel: string) {
  if (!value) return unavailableLabel;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return unavailableLabel;
  return new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadRoleCityMetrics(roleSlug: string, citySlug: string) {
  const rows = await getSalaryRoleCityMetrics({ citySlug, limit: 300 });
  return rows.find((item) => slugify(item.job_title) === roleSlug) || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { roleSlug, citySlug } = await params;
  const metric = await loadRoleCityMetrics(roleSlug, citySlug);
  if (!metric) {
    return { title: t('salaryRoleCityPage.metadata.notFoundTitle', 'Salary not found') };
  }

  const title = tf(
    'salaryRoleCityPage.metadata.title',
    'Salary {role} in {city} | Barometer',
    { role: metric.job_title, city: metric.city }
  );
  const description = hasSufficientSampleSize(metric.submission_count)
    ? tf(
      'salaryRoleCityPage.metadata.descriptionWithData',
      'Compare {role} in {city} with the national average. Log in to view detailed values.',
      { role: metric.job_title, city: metric.city }
    )
    : tf(
      'salaryRoleCityPage.metadata.descriptionInsufficient',
      'Insufficient data (fewer than {count} submissions) to show detailed values for {role} in {city}.',
      { count: MIN_PUBLIC_SAMPLE_SIZE, role: metric.job_title, city: metric.city }
    );
  const siteUrl = getServerSiteUrl();

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/salaires/role/${roleSlug}/${citySlug}`,
    },
  };
}

export default async function SalaryRoleCityPage({ params }: { params: Promise<Params> }) {
  const { t, tf, locale } = await getServerTranslator();
  const numberLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const dateLocale = numberLocale;
  const currencyLabel = t('salaryRoleCityPage.common.currencyMad', 'MAD');
  const loginToUnlockText = t('salaryRoleCityPage.common.loginToUnlock', 'Log in');
  const insufficientDataText = t('salaryRoleCityPage.common.insufficientData', 'Insufficient data');
  const unavailableText = t('salaryRoleCityPage.common.unavailable', 'Unavailable');
  const { roleSlug, citySlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUnlocked = !!user;

  const [metric, cityMetrics] = await Promise.all([
    loadRoleCityMetrics(roleSlug, citySlug),
    getSalaryCityMetrics(citySlug),
  ]);

  if (!metric) {
    notFound();
  }

  const city = cityMetrics[0];
  const hasEnoughData = hasSufficientSampleSize(metric.submission_count);
  const isSubscribed = isUnlocked
    ? await getSalaryAlertSubscriptionStatus('role_city', { roleSlug, citySlug })
    : false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('salaryRoleCityPage.hero.badge', 'Salary barometer')}</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {tf('salaryRoleCityPage.hero.title', 'Salary {role} in {city}', {
            role: metric.job_title,
            city: metric.city,
          })}
        </h1>
        <p className="text-muted-foreground">
          {tf(
            'salaryRoleCityPage.hero.submissions',
            'Data based on {count} published submissions.',
            { count: metric.submission_count }
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {tf('salaryRoleCityPage.hero.lastUpdated', 'Last updated: {date}', {
            date: formatRefreshedDate(metric.refreshed_at, dateLocale, unavailableText),
          })}
        </p>
      </section>

      <InternalAdsSlot
        placement="salary_role_city_inline"
        context={{ roleSlug, citySlug }}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('salaryRoleCityPage.cards.median', 'Median')}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {hasEnoughData
              ? (isUnlocked ? formatMoney(metric.median_monthly_salary, numberLocale, currencyLabel) : loginToUnlockText)
              : insufficientDataText}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t('salaryRoleCityPage.cards.range', 'Range')}</CardTitle></CardHeader>
          <CardContent className="text-lg font-bold">
            {hasEnoughData
              ? (isUnlocked
                ? `${formatMoney(metric.min_monthly_salary, numberLocale, currencyLabel)} - ${formatMoney(metric.max_monthly_salary, numberLocale, currencyLabel)}`
                : loginToUnlockText)
              : tf('salaryRoleCityPage.common.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t('salaryRoleCityPage.cards.vsNational', 'Vs national')}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {hasEnoughData
              ? (isUnlocked ? (metric.pct_vs_national_role_median === null ? '-' : `${metric.pct_vs_national_role_median}%`) : loginToUnlockText)
              : insufficientDataText}
          </CardContent>
        </Card>
      </section>

      <CareerPathMatrix jobTitle={metric.job_title} />

      {isUnlocked && hasEnoughData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('salaryRoleCityPage.cards.juniorMedian', 'Junior median')}</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold">{formatMoney(metric.junior_median_monthly_salary, numberLocale, currencyLabel)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('salaryRoleCityPage.cards.seniorMedian', 'Senior+ median')}</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold">{formatMoney(metric.senior_median_monthly_salary, numberLocale, currencyLabel)}</CardContent>
          </Card>
        </section>
      ) : (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">
            {hasEnoughData
              ? t('salaryRoleCityPage.locked.title', 'Unlock detailed analysis')
              : t('salaryRoleCityPage.locked.insufficientTitle', 'Insufficient data for a reliable statistic')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {hasEnoughData
              ? t(
                'salaryRoleCityPage.locked.withDataDescription',
                'Log in to view full range, junior/senior bands, and national comparison.'
              )
              : tf(
                'salaryRoleCityPage.locked.insufficientDescription',
                'This page only shows details from {count} submissions to protect confidentiality.',
                { count: MIN_PUBLIC_SAMPLE_SIZE }
              )}
          </p>
          {hasEnoughData && (
            <Button asChild>
              <Link href={`/login?next=/salaires/role/${roleSlug}/${citySlug}`}>
                {t('salaryRoleCityPage.locked.ctaLogin', 'Log in')}
              </Link>
            </Button>
          )}
        </section>
      )}

      {city && (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">
            {tf('salaryRoleCityPage.cityContext.title', 'City context: {city}', { city: city.city })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tf(
              'salaryRoleCityPage.cityContext.summary',
              'City median: {median} | Junior: {junior} | Senior+: {senior}',
              {
                median: isUnlocked ? formatMoney(city.median_monthly_salary, numberLocale, currencyLabel) : loginToUnlockText,
                junior: isUnlocked ? formatMoney(city.junior_median_monthly_salary, numberLocale, currencyLabel) : loginToUnlockText,
                senior: isUnlocked ? formatMoney(city.senior_median_monthly_salary, numberLocale, currencyLabel) : loginToUnlockText,
              }
            )}
          </p>
        </section>
      )}

      <section className="flex gap-3">
        <Button asChild>
          <Link href="/salaires/partager">{t('salaryRoleCityPage.actions.shareSalary', 'Share your salary')}</Link>
        </Button>
        {isUnlocked && (
          <SalaryAlertToggleButton
            scope="role_city"
            target={{ roleSlug, citySlug }}
            pathToRevalidate={`/salaires/role/${roleSlug}/${citySlug}`}
            initialIsSubscribed={isSubscribed}
          />
        )}
        <Button variant="outline" asChild>
          <Link href="/salaires">{t('salaryRoleCityPage.actions.moreAnalyses', 'View more analyses')}</Link>
        </Button>
      </section>
    </div>
  );
}

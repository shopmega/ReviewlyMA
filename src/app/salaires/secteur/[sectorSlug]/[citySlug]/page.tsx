import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getServerSiteUrl } from '@/lib/site-config';
import { getSalaryCityMetrics, getSalaryCitySectorMetrics } from '@/lib/data/salaries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { getSalaryAlertSubscriptionStatus } from '@/app/actions/salary-alerts';
import { SalaryAlertToggleButton } from '@/components/salaries/SalaryAlertToggleButton';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { GatekeeperOverlay } from '@/components/shared/GatekeeperOverlay';
import { getServerTranslator } from '@/lib/i18n/server';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

type Params = { sectorSlug: string; citySlug: string };

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

async function loadSectorCityMetrics(sectorSlug: string, citySlug: string) {
  const rows = await getSalaryCitySectorMetrics({ sectorSlug, citySlug, limit: 1 });
  return rows[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { t, tf } = await getServerTranslator();
  const { sectorSlug, citySlug } = await params;
  const metric = await loadSectorCityMetrics(sectorSlug, citySlug);
  if (!metric) {
    return { title: t('salarySectorCityPage.metadata.notFoundTitle', 'Sector not found') };
  }

  const title = tf(
    'salarySectorCityPage.metadata.title',
    'Sector salary {sector} in {city} | Barometer',
    { sector: metric.sector_slug, city: metric.city }
  );
  const description = hasSufficientSampleSize(metric.submission_count)
    ? tf(
      'salarySectorCityPage.metadata.descriptionWithData',
      'Compare sector {sector} in {city}. Log in to view detailed values.',
      { sector: metric.sector_slug, city: metric.city }
    )
    : tf(
      'salarySectorCityPage.metadata.descriptionInsufficient',
      'Insufficient data (fewer than {count} submissions) to show detailed values for sector {sector} in {city}.',
      { count: MIN_PUBLIC_SAMPLE_SIZE, sector: metric.sector_slug, city: metric.city }
    );
  const siteUrl = getServerSiteUrl();

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/salaires/secteur/${sectorSlug}/${citySlug}`,
    },
  };
}

export default async function SalarySectorCityPage({ params }: { params: Promise<Params> }) {
  const { t, tf, locale } = await getServerTranslator();
  const numberLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const dateLocale = numberLocale;
  const currencyLabel = t('salarySectorCityPage.common.currencyMad', 'MAD');
  const loginToUnlockText = t('salarySectorCityPage.common.loginToUnlock', 'Log in');
  const insufficientDataText = t('salarySectorCityPage.common.insufficientData', 'Insufficient data');
  const unavailableText = t('salarySectorCityPage.common.unavailable', 'Unavailable');
  const { sectorSlug, citySlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUnlocked = !!user;

  const [metric, cityMetrics] = await Promise.all([
    loadSectorCityMetrics(sectorSlug, citySlug),
    getSalaryCityMetrics(citySlug),
  ]);

  if (!metric) {
    notFound();
  }

  const city = cityMetrics[0];
  const hasEnoughData = hasSufficientSampleSize(metric.submission_count);
  const isSubscribed = isUnlocked
    ? await getSalaryAlertSubscriptionStatus('sector_city', { sectorSlug, citySlug })
    : false;
  const pagePath = `/salaires/secteur/${sectorSlug}/${citySlug}`;

  const pctVsCity = city?.avg_monthly_salary
    ? Number((((metric.avg_monthly_salary || 0) - city.avg_monthly_salary) / city.avg_monthly_salary * 100).toFixed(2))
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <Breadcrumb
        items={[
          { label: t('salarySectorCityPage.hero.badge', 'Salary barometer'), href: '/salaires' },
          { label: metric.city, href: `/salaires/secteur/${sectorSlug}/${citySlug}` },
          { label: metric.sector_slug, href: `/salaires/secteur/${sectorSlug}/${citySlug}` },
        ]}
      />

      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('salarySectorCityPage.hero.badge', 'Salary barometer')}</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {tf('salarySectorCityPage.hero.title', 'Sector salary {sector} in {city}', {
            sector: metric.sector_slug,
            city: metric.city,
          })}
        </h1>
        <p className="text-muted-foreground">
          {tf(
            'salarySectorCityPage.hero.submissions',
            'Data based on {submissions} published submissions ({businesses} companies).',
            { submissions: metric.submission_count, businesses: metric.business_count }
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {tf('salarySectorCityPage.hero.lastUpdated', 'Last updated: {date}', {
            date: formatRefreshedDate(metric.refreshed_at, dateLocale, unavailableText),
          })}
        </p>
      </section>

      <InternalAdsSlot
        placement="salary_sector_city_inline"
        context={{ sectorSlug, citySlug }}
      />

      <GatekeeperOverlay
        active={!isUnlocked && hasEnoughData}
        nextPath={pagePath}
        intent="salary_sector_city_unlock"
        title={t('salarySectorCityPage.locked.title', 'Unlock detailed analysis')}
        description={t(
          'salarySectorCityPage.locked.withDataDescription',
          'Log in to view the full range and junior/senior details for this sector.'
        )}
        ctaLabel={t('salarySectorCityPage.locked.ctaLogin', 'Log in')}
        className="rounded-3xl"
      >
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('salarySectorCityPage.cards.median', 'Median')}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">
              {hasEnoughData ? formatMoney(metric.median_monthly_salary, numberLocale, currencyLabel) : insufficientDataText}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('salarySectorCityPage.cards.range', 'Range')}</CardTitle></CardHeader>
            <CardContent className="text-lg font-bold">
              {hasEnoughData
                ? `${formatMoney(metric.min_monthly_salary, numberLocale, currencyLabel)} - ${formatMoney(metric.max_monthly_salary, numberLocale, currencyLabel)}`
                : tf('salarySectorCityPage.common.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('salarySectorCityPage.cards.vsCityAverage', 'Vs city average')}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">
              {hasEnoughData ? (pctVsCity === null ? '-' : `${pctVsCity}%`) : insufficientDataText}
            </CardContent>
          </Card>
        </section>
      </GatekeeperOverlay>

      {hasEnoughData ? (
        <GatekeeperOverlay
          active={!isUnlocked}
          nextPath={pagePath}
          intent="salary_sector_city_unlock"
          title={t('salarySectorCityPage.locked.title', 'Unlock detailed analysis')}
          description={t(
            'salarySectorCityPage.locked.withDataDescription',
            'Log in to view the full range and junior/senior details for this sector.'
          )}
          ctaLabel={t('salarySectorCityPage.locked.ctaLogin', 'Log in')}
          className="rounded-3xl"
        >
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('salarySectorCityPage.cards.juniorMedian', 'Junior median')}</CardTitle></CardHeader>
              <CardContent className="text-xl font-semibold">{formatMoney(metric.junior_median_monthly_salary, numberLocale, currencyLabel)}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('salarySectorCityPage.cards.seniorMedian', 'Senior+ median')}</CardTitle></CardHeader>
              <CardContent className="text-xl font-semibold">{formatMoney(metric.senior_median_monthly_salary, numberLocale, currencyLabel)}</CardContent>
            </Card>
          </section>
        </GatekeeperOverlay>
      ) : (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">
            {t('salarySectorCityPage.locked.insufficientTitle', 'Insufficient data for a reliable statistic')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {tf(
              'salarySectorCityPage.locked.insufficientDescription',
              'This page only shows details from {count} submissions to protect confidentiality.',
              { count: MIN_PUBLIC_SAMPLE_SIZE }
            )}
          </p>
        </section>
      )}

      <section className="flex gap-3">
        <Button asChild>
          <Link href="/salaires/partager">{t('salarySectorCityPage.actions.shareSalary', 'Share your salary')}</Link>
        </Button>
        {isUnlocked && (
          <SalaryAlertToggleButton
            scope="sector_city"
            target={{ sectorSlug, citySlug }}
            pathToRevalidate={`/salaires/secteur/${sectorSlug}/${citySlug}`}
            initialIsSubscribed={isSubscribed}
          />
        )}
        <Button variant="outline" asChild>
          <Link href="/salaires">{t('salarySectorCityPage.actions.moreAnalyses', 'View more analyses')}</Link>
        </Button>
      </section>
    </div>
  );
}

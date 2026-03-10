import Link from 'next/link';
import { getTopSalaryRoleCityPairs, getTopSalarySectorCityPairs } from '@/lib/data/salaries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { ArrowRight, BarChart3, CircleHelp, TrendingUp } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('salaryIndexPage.metadata.title', 'Salary barometer in Morocco'),
    description: t(
      'salaryIndexPage.metadata.description',
      'Explore salaries by role, city and sector in Morocco.'
    ),
  };
}

function formatMoney(value: number | null | undefined, locale: string, currencyLabel: string) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString(locale)} ${currencyLabel}`;
}

export default async function SalariesIndexPage() {
  const { t, tf, locale } = await getServerTranslator();
  const numberLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const currencyLabel = t('salaryIndexPage.common.currencyMad', 'MAD');
  const previewLabel = t('salaryIndexPage.common.preview', 'Preview');
  const insufficientDataLabel = t('salaryIndexPage.common.insufficientData', 'Insufficient data');
  const loginForDetailsLabel = t('salaryIndexPage.common.loginForDetails', 'Log in for details');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUnlocked = !!user;

  const [roleCityPairs, sectorCityPairs] = await Promise.all([
    getTopSalaryRoleCityPairs(24),
    getTopSalarySectorCityPairs(24),
  ]);
  const roleChartRows = roleCityPairs
    .filter((item) => hasSufficientSampleSize(item.submission_count) && typeof item.median_monthly_salary === 'number')
    .sort((a, b) => (b.median_monthly_salary || 0) - (a.median_monthly_salary || 0))
    .slice(0, 8);
  const chartMax = roleChartRows.reduce((max, item) => Math.max(max, item.median_monthly_salary || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-secondary/30 p-6 md:p-10">
        <div className="space-y-4 max-w-3xl">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
            {t('salaryIndexPage.hero.badge', 'Barometer')}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            {t('salaryIndexPage.hero.title', 'Salaries in Morocco')}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {t(
              'salaryIndexPage.hero.description',
              'Explore salaries by role, city and sector. Anonymous data based on published submissions.'
            )}
          </p>
          <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <CircleHelp className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              {t(
                'salaryIndexPage.hero.helper',
                'Start by choosing a role or city, then open comparison to see differences.'
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button asChild className="h-11 px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <Link href="/salaires/comparaison" className="inline-flex items-center gap-2">
                {t('salaryIndexPage.hero.compareCta', 'Compare salaries')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-11 px-5 text-sm font-semibold transition-colors">
              <Link href="/salaires/partager">{t('salaryIndexPage.hero.shareCta', 'Share your salary')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('salaryIndexPage.chart.title', 'Median salary by role (top samples)')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tf(
              'salaryIndexPage.chart.description',
              'Display is limited to roles with at least {count} published submissions.',
              { count: MIN_PUBLIC_SAMPLE_SIZE }
            )}
          </p>
        </div>
        {roleChartRows.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
            {t('salaryIndexPage.chart.empty', 'Not enough public data to display the chart.')}
          </p>
        ) : (
          <div className="space-y-3">
            {roleChartRows.map((item) => {
              const ratio = chartMax > 0 ? Math.max(8, Math.round(((item.median_monthly_salary || 0) / chartMax) * 100)) : 8;
              const roleSlug = slugify(item.job_title);
              return (
                <Link
                  key={`chart-${item.job_title}-${item.city_slug}`}
                  href={`/salaires/role/${roleSlug}/${item.city_slug}`}
                  className="block rounded-xl border border-border/70 p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold truncate">{item.job_title} <span className="text-muted-foreground font-normal">({item.city})</span></p>
                    <p className="text-sm font-bold whitespace-nowrap">
                      {isUnlocked
                        ? formatMoney(item.median_monthly_salary, numberLocale, currencyLabel)
                        : previewLabel}
                    </p>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-secondary/80 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/85" style={{ width: `${ratio}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <InternalAdsSlot placement="salary_page_top_banner" />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t('salaryIndexPage.roleCards.title', 'Average salaries by role')}</CardTitle>
            <CardDescription>
              {t('salaryIndexPage.roleCards.description', 'Role + city with sample reliability context.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleCityPairs.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                {t('salaryIndexPage.common.noData', 'No data available yet.')}
              </p>
            )}
            {roleCityPairs.map((item) => {
              const roleSlug = slugify(item.job_title);
              const hasEnoughData = hasSufficientSampleSize(item.submission_count);
              return (
                <Link
                  key={`${item.job_title}-${item.city_slug}`}
                  href={`/salaires/role/${roleSlug}/${item.city_slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:bg-secondary transition-colors"
                >
                  <div>
                    <p className="font-semibold">{item.job_title}</p>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {hasEnoughData
                        ? (isUnlocked
                          ? formatMoney(item.median_monthly_salary, numberLocale, currencyLabel)
                          : previewLabel)
                        : insufficientDataLabel}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {hasEnoughData
                          ? (isUnlocked
                            ? tf('salaryIndexPage.common.dataCount', '{count} data points', { count: item.submission_count })
                            : loginForDetailsLabel)
                          : tf('salaryIndexPage.common.submissionsUnder', '< {count} submissions', {
                            count: MIN_PUBLIC_SAMPLE_SIZE,
                          })}
                      </p>
                      <Badge
                        variant="outline"
                        className={hasEnoughData ? 'text-emerald-700 border-emerald-300' : 'text-amber-700 border-amber-300'}
                        title={hasEnoughData
                          ? t('salaryIndexPage.sample.okTitle', 'Sufficient sample for public display')
                          : tf('salaryIndexPage.sample.lowTitle', 'Below public threshold ({count})', {
                            count: MIN_PUBLIC_SAMPLE_SIZE,
                          })}
                      >
                        {hasEnoughData
                          ? t('salaryIndexPage.sample.okBadge', 'Sample OK')
                          : t('salaryIndexPage.sample.lowBadge', 'Low sample')}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t('salaryIndexPage.sectorCards.title', 'Sector trends')}</CardTitle>
            <CardDescription>
              {t('salaryIndexPage.sectorCards.description', 'Sector + city market read with confidence level.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorCityPairs.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                {t('salaryIndexPage.common.noData', 'No data available yet.')}
              </p>
            )}
            {sectorCityPairs.map((item) => (
              (() => {
                const hasEnoughData = hasSufficientSampleSize(item.submission_count);
                return (
                  <Link
                    key={`${item.sector_slug}-${item.city_slug}`}
                    href={`/salaires/secteur/${item.sector_slug}/${item.city_slug}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-secondary transition-colors"
                  >
                  <div>
                    <p className="font-semibold">{item.sector_slug}</p>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </div>
                  <div className="text-right">
                      <p className="font-bold">
                        {hasEnoughData
                          ? (isUnlocked
                            ? formatMoney(item.median_monthly_salary, numberLocale, currencyLabel)
                            : previewLabel)
                          : insufficientDataLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasEnoughData
                          ? (isUnlocked
                            ? tf('salaryIndexPage.common.dataCount', '{count} data points', { count: item.submission_count })
                            : loginForDetailsLabel)
                          : tf('salaryIndexPage.common.submissionsUnder', '< {count} submissions', {
                            count: MIN_PUBLIC_SAMPLE_SIZE,
                          })}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <Badge
                          variant="outline"
                          className={hasEnoughData ? 'text-emerald-700 border-emerald-300' : 'text-amber-700 border-amber-300'}
                          title={hasEnoughData
                            ? t('salaryIndexPage.sample.okTitle', 'Sufficient sample for public display')
                            : tf('salaryIndexPage.sample.lowTitle', 'Below public threshold ({count})', {
                              count: MIN_PUBLIC_SAMPLE_SIZE,
                            })}
                        >
                          {hasEnoughData
                            ? t('salaryIndexPage.sample.okBadge', 'Sample OK')
                            : t('salaryIndexPage.sample.lowBadge', 'Low sample')}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })()
            ))}
          </CardContent>
        </Card>
      </section>

      <InternalAdsSlot placement="salary_page_inline" />

      {!isUnlocked && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-lg mb-1">{t('salaryIndexPage.locked.title', 'Preview mode active')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t(
              'salaryIndexPage.locked.description',
              'You are seeing a limited preview. Log in to access detailed values and advanced comparison.'
            )}
          </p>
          <Button asChild>
            <Link href="/login?next=/salaires">{t('salaryIndexPage.locked.ctaLogin', 'Log in')}</Link>
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('salaryIndexPage.contribute.title', 'Contribute to the barometer')}
          </h2>
          <p className="text-muted-foreground">
            {t(
              'salaryIndexPage.contribute.description',
              'Sharing your salary improves statistical accuracy and unlocks better insights for everyone.'
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t(
              'salaryIndexPage.contribute.note',
              'Data is anonymized and aggregated. Public results follow a minimum sample threshold.'
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
          <Button asChild className="h-11 text-sm font-semibold">
            <Link href="/salaires/partager">{t('salaryIndexPage.contribute.ctaShare', 'Share your salary')}</Link>
          </Button>
          <Button variant="outline" asChild className="h-11 text-sm font-semibold">
            <Link href="/salaires/comparaison">{t('salaryIndexPage.contribute.ctaCompare', 'Comparison tool')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

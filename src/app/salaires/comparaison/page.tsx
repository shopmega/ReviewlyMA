import Link from 'next/link';
import { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import {
  getSalaryCityMetrics,
  getSalaryCompanyMetricsList,
  getSalaryRoleCityMetric,
  getTopSalaryRoleCityPairs,
} from '@/lib/data/salaries';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { ContentShareButton } from '@/components/shared/ContentShareButton';
import { GatekeeperOverlay } from '@/components/shared/GatekeeperOverlay';
import { getServerSiteUrl } from '@/lib/site-config';
import { getServerTranslator } from '@/lib/i18n/server';

type SearchParams = {
  companyA?: string;
  companyB?: string;
  companyALabel?: string;
  companyBLabel?: string;
  role?: string;
  roleLabel?: string;
  cityA?: string;
  cityB?: string;
  cityALabel?: string;
  cityBLabel?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const siteUrl = getServerSiteUrl();
  const { t, tf } = await getServerTranslator();

  const hasCompanyCompare = !!sp.companyA && !!sp.companyB;
  const hasRoleCompare = !!sp.role && !!sp.cityA && !!sp.cityB;

  let title = t(
    'salaryComparisonPage.metadata.defaultTitle',
    'Company comparison: salary and reputation'
  );
  let description = t(
    'salaryComparisonPage.metadata.defaultDescription',
    'Compare salaries and company reputation in Morocco.'
  );

  if (hasCompanyCompare) {
    const companyALabel = sp.companyALabel || t('salaryComparisonPage.metadata.defaults.companyA', 'Company A');
    const companyBLabel = sp.companyBLabel || t('salaryComparisonPage.metadata.defaults.companyB', 'Company B');
    title = tf(
      'salaryComparisonPage.metadata.companyTitle',
      '{companyA} vs {companyB} | Salaries and reputation',
      { companyA: companyALabel, companyB: companyBLabel }
    );
    description = tf(
      'salaryComparisonPage.metadata.companyDescription',
      'Compare salary trends and review reputation between {companyA} and {companyB} in Morocco.',
      { companyA: companyALabel, companyB: companyBLabel }
    );
  } else if (hasRoleCompare) {
    const roleLabel = sp.roleLabel || t('salaryComparisonPage.metadata.defaults.role', 'Role');
    const cityALabel = sp.cityALabel || t('salaryComparisonPage.metadata.defaults.cityA', 'City A');
    const cityBLabel = sp.cityBLabel || t('salaryComparisonPage.metadata.defaults.cityB', 'City B');
    title = tf(
      'salaryComparisonPage.metadata.roleTitle',
      '{role}: {cityA} vs {cityB} | Salary comparison',
      { role: roleLabel, cityA: cityALabel, cityB: cityBLabel }
    );
    description = tf(
      'salaryComparisonPage.metadata.roleDescription',
      'Compare salaries for {role} between {cityA} and {cityB}.',
      { role: roleLabel, cityA: cityALabel, cityB: cityBLabel }
    );
  }

  const ogQuery = new URLSearchParams();
  if (sp.companyALabel) ogQuery.set('companyALabel', sp.companyALabel);
  if (sp.companyBLabel) ogQuery.set('companyBLabel', sp.companyBLabel);
  if (sp.roleLabel) ogQuery.set('roleLabel', sp.roleLabel);
  if (sp.cityALabel) ogQuery.set('cityALabel', sp.cityALabel);
  if (sp.cityBLabel) ogQuery.set('cityBLabel', sp.cityBLabel);
  ogQuery.set('mode', hasCompanyCompare ? 'company' : hasRoleCompare ? 'role_city' : 'default');

  const imageUrl = `${siteUrl}/api/og/salary-comparison?${ogQuery.toString()}`;
  const canonicalQuery = new URLSearchParams();
  if (sp.companyA) canonicalQuery.set('companyA', sp.companyA);
  if (sp.companyB) canonicalQuery.set('companyB', sp.companyB);
  if (sp.role) canonicalQuery.set('role', sp.role);
  if (sp.cityA) canonicalQuery.set('cityA', sp.cityA);
  if (sp.cityB) canonicalQuery.set('cityB', sp.cityB);
  const canonical = canonicalQuery.toString()
    ? `${siteUrl}/salaires/comparaison?${canonicalQuery.toString()}`
    : `${siteUrl}/salaires/comparaison`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t('salaryComparisonPage.metadata.ogAlt', 'Salary comparison'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

function formatMoney(value: number | null | undefined, locale = 'en-US') {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString(locale)} MAD`;
}

function formatRating(value: number | null | undefined, notDefinedLabel = 'Not set') {
  if (value === null || value === undefined) return notDefinedLabel;
  return `${value.toFixed(1)} / 5`;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}

function getConfidenceLabel(
  totalReviews: number | null | undefined,
  t: (key: string, fallback?: string) => string
) {
  const count = totalReviews ?? 0;
  if (count >= 60) return t('salaryComparisonPage.confidence.high', 'High confidence');
  if (count >= 20) return t('salaryComparisonPage.confidence.medium', 'Medium confidence');
  if (count > 0) return t('salaryComparisonPage.confidence.building', 'Building confidence');
  return t('salaryComparisonPage.confidence.none', 'No reviews');
}

function formatRefreshedDate(value: string | null | undefined, locale = 'en-US', unavailableLabel = 'Unavailable') {
  if (!value) return unavailableLabel;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return unavailableLabel;
  return new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function valueTone(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text-foreground';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-rose-600';
  return 'text-foreground';
}

function leaderLabel(
  value: number | null | undefined,
  leftLabel: string,
  rightLabel: string,
  tieLabel = 'Tie',
  advantageTemplate?: (side: string) => string
) {
  if (value === null || value === undefined || Number.isNaN(value)) return tieLabel;
  const advantage = advantageTemplate || ((side: string) => `Advantage ${side}`);
  if (value > 0) return advantage(leftLabel);
  if (value < 0) return advantage(rightLabel);
  return tieLabel;
}

export default async function SalaryComparisonPage({ searchParams }: PageProps) {
  const { t, tf, locale } = await getServerTranslator();
  const numberLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';
  const dateLocale = numberLocale;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const { count: salaryContributionCount } = user
    ? await supabase
        .from('salaries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'published'])
    : { count: 0 };
  const hasSalaryContribution = (salaryContributionCount ?? 0) > 0;
  const isUnlocked = hasSalaryContribution;

  const [companyMetrics, cityMetrics, roleCityPairs] = await Promise.all([
    getSalaryCompanyMetricsList(300),
    getSalaryCityMetrics(),
    getTopSalaryRoleCityPairs(400),
  ]);

  const roleCatalogMap = new Map<string, string>();
  for (const row of roleCityPairs) {
    const key = slugify(row.job_title);
    if (!roleCatalogMap.has(key)) {
      roleCatalogMap.set(key, row.job_title);
    }
  }
  const roleCatalog = Array.from(roleCatalogMap.entries()).map(([slug, label]) => ({ slug, label }));
  const companyMetricsWithSample = companyMetrics.filter((c) => hasSufficientSampleSize(c.submission_count));
  const roleCityPairsWithSample = roleCityPairs.filter((r) => hasSufficientSampleSize(r.submission_count));
  const previewCompanyMetrics = isUnlocked ? companyMetricsWithSample : companyMetricsWithSample.slice(0, 50);
  const previewRoleCatalog = isUnlocked
    ? roleCatalog.filter((r) => roleCityPairsWithSample.some((row) => slugify(row.job_title) === r.slug))
    : roleCatalog.filter((r) => roleCityPairsWithSample.some((row) => slugify(row.job_title) === r.slug)).slice(0, 80);
  const previewCityMetrics = isUnlocked ? cityMetrics : cityMetrics.slice(0, 30);

  const companyAId = sp.companyA || '';
  const companyBId = sp.companyB || '';
  const roleSlug = sp.role || '';
  const cityASlug = sp.cityA || '';
  const cityBSlug = sp.cityB || '';

  const companyA = companyMetrics.find((c) => c.business_id === companyAId) || null;
  const companyB = companyMetrics.find((c) => c.business_id === companyBId) || null;
  const selectedRole = roleCatalog.find((r) => r.slug === roleSlug)?.label || null;
  const cityA = cityMetrics.find((c) => c.city_slug === cityASlug) || null;
  const cityB = cityMetrics.find((c) => c.city_slug === cityBSlug) || null;

  const [roleCityA, roleCityB] = await Promise.all([
    selectedRole && cityASlug ? getSalaryRoleCityMetric(selectedRole, cityASlug) : Promise.resolve(null),
    selectedRole && cityBSlug ? getSalaryRoleCityMetric(selectedRole, cityBSlug) : Promise.resolve(null),
  ]);

  const comparedBusinessIds = Array.from(new Set([companyAId, companyBId].filter(Boolean)));
  const { data: comparedBusinesses } = comparedBusinessIds.length
    ? await supabase
        .from('businesses')
        .select('id,overall_rating,review_count')
        .in('id', comparedBusinessIds)
    : { data: [] as Array<{ id: string; overall_rating: number | null; review_count: number | null }> };

  const reputationMap = new Map((comparedBusinesses || []).map((row) => [row.id, row]));
  const companyAReputation = reputationMap.get(companyAId);
  const companyBReputation = reputationMap.get(companyBId);
  const companyARating = companyAReputation?.overall_rating ?? null;
  const companyBRating = companyBReputation?.overall_rating ?? null;
  const companyAReviewCount = companyAReputation?.review_count ?? 0;
  const companyBReviewCount = companyBReputation?.review_count ?? 0;
  const reviewRatingGap = companyARating !== null && companyBRating !== null ? companyARating - companyBRating : null;
  const reviewVolumeGap = companyAReviewCount - companyBReviewCount;

  const companyGap = (companyA?.median_monthly_salary ?? 0) - (companyB?.median_monthly_salary ?? 0);
  const roleGap = (roleCityA?.median_monthly_salary ?? 0) - (roleCityB?.median_monthly_salary ?? 0);
  const companyAHasData = hasSufficientSampleSize(companyA?.submission_count);
  const companyBHasData = hasSufficientSampleSize(companyB?.submission_count);
  const roleAHasData = hasSufficientSampleSize(roleCityA?.submission_count);
  const roleBHasData = hasSufficientSampleSize(roleCityB?.submission_count);
  const siteUrl = getServerSiteUrl();

  const companyComparisonSearch = new URLSearchParams({
    companyA: companyAId,
    companyB: companyBId,
    companyALabel: companyA?.business_name || '',
    companyBLabel: companyB?.business_name || '',
  });
  const companyComparisonUrl = `${siteUrl}/salaires/comparaison?${companyComparisonSearch.toString()}`;
  const roleComparisonSearch = new URLSearchParams({
    role: roleSlug,
    cityA: cityASlug,
    cityB: cityBSlug,
    roleLabel: selectedRole || '',
    cityALabel: cityA?.city || '',
    cityBLabel: cityB?.city || '',
  });
  const roleComparisonUrl = `${siteUrl}/salaires/comparaison?${roleComparisonSearch.toString()}`;
  const insufficientDataText = t('salaryComparisonPage.common.insufficientData', 'Insufficient data');
  const notDefinedText = t('salaryComparisonPage.common.notDefined', 'Not set');
  const advantageTemplate = (side: string) =>
    tf('salaryComparisonPage.common.advantage', 'Advantage {side}', { side });
  const companySalaryDeltaDisplay = companyAHasData && companyBHasData
    ? `${companyGap >= 0 ? '+' : ''}${companyGap.toLocaleString(numberLocale)} MAD`
    : insufficientDataText;
  const companyRatingDeltaDisplay = reviewRatingGap === null
    ? notDefinedText
    : `${reviewRatingGap >= 0 ? '+' : ''}${reviewRatingGap.toFixed(1)} / 5`;
  const companyVolumeDeltaDisplay = `${reviewVolumeGap >= 0 ? '+' : ''}${reviewVolumeGap.toLocaleString(numberLocale)}`;
  const roleSalaryDeltaDisplay = roleAHasData && roleBHasData
    ? `${roleGap >= 0 ? '+' : ''}${roleGap.toLocaleString(numberLocale)} MAD`
    : insufficientDataText;
  const companySalaryLeader = companyAHasData && companyBHasData
    ? leaderLabel(
      companyGap,
      t('salaryComparisonPage.common.leftLabelA', 'A'),
      t('salaryComparisonPage.common.rightLabelB', 'B'),
      t('salaryComparisonPage.common.tie', 'Tie'),
      advantageTemplate
    )
    : insufficientDataText;
  const companyRatingLeader = leaderLabel(
      reviewRatingGap,
      t('salaryComparisonPage.common.leftLabelA', 'A'),
      t('salaryComparisonPage.common.rightLabelB', 'B'),
      t('salaryComparisonPage.common.tie', 'Tie'),
      advantageTemplate
    );
  const roleSalaryLeader = roleAHasData && roleBHasData
    ? leaderLabel(
      roleGap,
      cityA?.city || t('salaryComparisonPage.common.leftLabelA', 'A'),
      cityB?.city || t('salaryComparisonPage.common.rightLabelB', 'B'),
      t('salaryComparisonPage.common.tie', 'Tie'),
      advantageTemplate
    )
    : insufficientDataText;
  const currentComparisonSearch = companyAId && companyBId
    ? companyComparisonSearch.toString()
    : roleSlug && cityASlug && cityBSlug
      ? roleComparisonSearch.toString()
      : '';
  const currentComparisonPath = `/salaires/comparaison${currentComparisonSearch ? `?${currentComparisonSearch}` : ''}`;
  const comparisonGateTitle = t('salaryComparisonPage.locked.title', 'Unlock detailed comparison');
  const comparisonGateDescription = isAuthenticated
    ? t(
      'salaryComparisonPage.locked.authenticatedDescription',
      'Share at least one salary to unlock junior/senior details, full deltas, and advanced benchmarks.'
    )
    : t(
      'salaryComparisonPage.locked.guestDescription',
      'Create an account or log in, then share a salary to unlock junior/senior details, full deltas, and advanced benchmarks.'
    );
  const comparisonGateCtaLabel = isAuthenticated
    ? t('salaryComparisonPage.locked.ctaShareSalary', 'Share my salary')
    : t('salaryComparisonPage.locked.ctaLogin', 'Log in');
  const comparisonGateHref = isAuthenticated ? '/salaires/partager' : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
          {t('salaryComparisonPage.hero.badge', 'Comparison tool')}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {t('salaryComparisonPage.hero.title', 'Comparison: salary and reputation')}
        </h1>
        <p className="text-muted-foreground">
          {t(
            'salaryComparisonPage.hero.subtitle',
            'Compare company vs company (salary + reviews) and role across two cities. Shareable URL via filters.'
          )}
        </p>
      </section>

      <InternalAdsSlot placement="salary_compare_top_banner" />

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle>{t('salaryComparisonPage.company.title', 'Company vs company')}</CardTitle>
          <CardDescription>
            {t('salaryComparisonPage.company.description', 'Compare published salaries and review-based reputation.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select name="companyA" defaultValue={companyAId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">{t('salaryComparisonPage.company.selectCompanyA', 'Select company A')}</option>
              {previewCompanyMetrics.map((c) => (
                <option key={`a-${c.business_id}`} value={c.business_id}>{c.business_name}</option>
              ))}
            </select>
            <select name="companyB" defaultValue={companyBId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">{t('salaryComparisonPage.company.selectCompanyB', 'Select company B')}</option>
              {previewCompanyMetrics.map((c) => (
                <option key={`b-${c.business_id}`} value={c.business_id}>{c.business_name}</option>
              ))}
            </select>
            <Button type="submit">{t('salaryComparisonPage.company.compare', 'Compare')}</Button>
          </form>

          {(!companyAId || !companyBId) && (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
              {t(
                'salaryComparisonPage.company.emptyHint',
                'Select two companies then click "Compare".'
              )}
            </p>
          )}

          {companyA && companyB && (
            <GatekeeperOverlay
              active={!isUnlocked}
              nextPath={currentComparisonPath}
              intent="salary_comparison_unlock"
              title={comparisonGateTitle}
              description={comparisonGateDescription}
              ctaLabel={comparisonGateCtaLabel}
              ctaHref={comparisonGateHref}
              className="rounded-2xl"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card className="lg:col-span-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm">
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{companyA.business_name}</span>
                        <span>{t('salaryComparisonPage.common.vs', 'vs')}</span>
                        <span>{companyB.business_name}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('salaryComparisonPage.company.summary', 'Compared view of salaries and reputation.')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('salaryComparisonPage.common.medianSalaryDelta', 'Median salary delta')}
                      </p>
                      <p className={`mt-2 text-2xl font-black ${valueTone(companyAHasData && companyBHasData ? companyGap : null)}`}>
                        {companySalaryDeltaDisplay}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{companySalaryLeader}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-primary/15 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 bg-gradient-to-r from-muted/50 to-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="px-4 py-3">{t('salaryComparisonPage.table.indicator', 'Indicator')}</div>
                    <div className="px-4 py-3">{companyA.business_name}</div>
                    <div className="px-4 py-3">{companyB.business_name}</div>
                    <div className="px-4 py-3">{t('salaryComparisonPage.table.deltaAB', 'Delta A-B')}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.medianSalary', 'Median salary')}</div>
                    <div className="px-4 py-3 text-sm">{companyAHasData ? formatMoney(companyA.median_monthly_salary, numberLocale) : insufficientDataText}</div>
                    <div className="px-4 py-3 text-sm">{companyBHasData ? formatMoney(companyB.median_monthly_salary, numberLocale) : insufficientDataText}</div>
                    <div className={`px-4 py-3 text-sm font-semibold ${valueTone(companyAHasData && companyBHasData ? companyGap : null)}`}>{companySalaryDeltaDisplay}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t bg-muted/10">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.averageSalary', 'Average salary')}</div>
                    <div className="px-4 py-3 text-sm">{companyAHasData ? formatMoney(companyA.avg_monthly_salary, numberLocale) : tf('salaryComparisonPage.table.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}</div>
                    <div className="px-4 py-3 text-sm">{companyBHasData ? formatMoney(companyB.avg_monthly_salary, numberLocale) : tf('salaryComparisonPage.table.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.positionVsCity', 'Position vs city')}</div>
                    <div className="px-4 py-3 text-sm">{companyAHasData ? formatPct(companyA.pct_above_city_avg) : '-'}</div>
                    <div className="px-4 py-3 text-sm">{companyBHasData ? formatPct(companyB.pct_above_city_avg) : '-'}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t bg-muted/10">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.reviewRating', 'Average review rating')}</div>
                    <div className="px-4 py-3 text-sm">{formatRating(companyARating, notDefinedText)}</div>
                    <div className="px-4 py-3 text-sm">{formatRating(companyBRating, notDefinedText)}</div>
                    <div className={`px-4 py-3 text-sm font-semibold ${valueTone(reviewRatingGap)}`}>{companyRatingDeltaDisplay}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.reviewVolume', 'Review volume')}</div>
                    <div className="px-4 py-3 text-sm">{companyAReviewCount.toLocaleString(numberLocale)}</div>
                    <div className="px-4 py-3 text-sm">{companyBReviewCount.toLocaleString(numberLocale)}</div>
                    <div className={`px-4 py-3 text-sm font-semibold ${valueTone(reviewVolumeGap)}`}>{companyVolumeDeltaDisplay}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t bg-muted/10">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.reviewConfidence', 'Review confidence')}</div>
                    <div className="px-4 py-3 text-sm">{getConfidenceLabel(companyAReviewCount, t)}</div>
                    <div className="px-4 py-3 text-sm">{getConfidenceLabel(companyBReviewCount, t)}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.lastUpdated', 'Last updated')}</div>
                    <div className="px-4 py-3 text-sm">{formatRefreshedDate(companyA.refreshed_at, dateLocale, t('salaryComparisonPage.common.unavailable', 'Unavailable'))}</div>
                    <div className="px-4 py-3 text-sm">{formatRefreshedDate(companyB.refreshed_at, dateLocale, t('salaryComparisonPage.common.unavailable', 'Unavailable'))}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">{companyRatingLeader}</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <ContentShareButton
                    url={companyComparisonUrl}
                    title={tf(
                      'salaryComparisonPage.share.companyTitle',
                      'Company comparison: {companyA} vs {companyB}',
                      { companyA: companyA.business_name, companyB: companyB.business_name }
                    )}
                    text={tf(
                      'salaryComparisonPage.share.companyText',
                      'Salary and reputation comparison between {companyA} and {companyB}.',
                      { companyA: companyA.business_name, companyB: companyB.business_name }
                    )}
                    contentType="salary_company_comparison"
                    contentId={`${companyA.business_id}_${companyB.business_id}`}
                    cardType="company_delta"
                  />
                </div>
              </div>
            </GatekeeperOverlay>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle>{t('salaryComparisonPage.role.title', 'Role: city A vs city B')}</CardTitle>
          <CardDescription>{t('salaryComparisonPage.role.description', 'Compare the same role across two cities.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select name="role" defaultValue={roleSlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">{t('salaryComparisonPage.role.selectRole', 'Select a role')}</option>
              {previewRoleCatalog.map((r) => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
            <select name="cityA" defaultValue={cityASlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">{t('salaryComparisonPage.role.selectCityA', 'Select city A')}</option>
              {previewCityMetrics.map((c) => (
                <option key={`ca-${c.city_slug}`} value={c.city_slug}>{c.city}</option>
              ))}
            </select>
            <select name="cityB" defaultValue={cityBSlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">{t('salaryComparisonPage.role.selectCityB', 'Select city B')}</option>
              {previewCityMetrics.map((c) => (
                <option key={`cb-${c.city_slug}`} value={c.city_slug}>{c.city}</option>
              ))}
            </select>
            <Button type="submit">{t('salaryComparisonPage.role.compare', 'Compare')}</Button>
          </form>

          {(!roleSlug || !cityASlug || !cityBSlug) && (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
              {t('salaryComparisonPage.role.emptyHint', 'Select one role and two cities to start the comparison.')}
            </p>
          )}

          {selectedRole && roleCityA && roleCityB && cityA && cityB && (
            <GatekeeperOverlay
              active={!isUnlocked}
              nextPath={currentComparisonPath}
              intent="salary_comparison_unlock"
              title={comparisonGateTitle}
              description={comparisonGateDescription}
              ctaLabel={comparisonGateCtaLabel}
              ctaHref={comparisonGateHref}
              className="rounded-2xl"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card className="lg:col-span-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm">
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{selectedRole}</span>
                        <span>|</span>
                        <span>{cityA.city}</span>
                        <span>{t('salaryComparisonPage.common.vs', 'vs')}</span>
                        <span>{cityB.city}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('salaryComparisonPage.role.summary', 'Comparison of the same role across two local markets.')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('salaryComparisonPage.common.medianSalaryDelta', 'Median salary delta')}
                      </p>
                      <p className={`mt-2 text-2xl font-black ${valueTone(roleAHasData && roleBHasData ? roleGap : null)}`}>
                        {roleSalaryDeltaDisplay}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{roleSalaryLeader}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-primary/15 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 bg-gradient-to-r from-muted/50 to-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="px-4 py-3">{t('salaryComparisonPage.table.indicator', 'Indicator')}</div>
                    <div className="px-4 py-3">{cityA.city}</div>
                    <div className="px-4 py-3">{cityB.city}</div>
                    <div className="px-4 py-3">{t('salaryComparisonPage.table.deltaAB', 'Delta A-B')}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.medianSalary', 'Median salary')}</div>
                    <div className="px-4 py-3 text-sm">{roleAHasData ? formatMoney(roleCityA.median_monthly_salary, numberLocale) : insufficientDataText}</div>
                    <div className="px-4 py-3 text-sm">{roleBHasData ? formatMoney(roleCityB.median_monthly_salary, numberLocale) : insufficientDataText}</div>
                    <div className={`px-4 py-3 text-sm font-semibold ${valueTone(roleAHasData && roleBHasData ? roleGap : null)}`}>{roleSalaryDeltaDisplay}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t bg-muted/10">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.juniorBand', 'Junior band')}</div>
                    <div className="px-4 py-3 text-sm">{roleAHasData ? formatMoney(roleCityA.junior_median_monthly_salary, numberLocale) : tf('salaryComparisonPage.table.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}</div>
                    <div className="px-4 py-3 text-sm">{roleBHasData ? formatMoney(roleCityB.junior_median_monthly_salary, numberLocale) : tf('salaryComparisonPage.table.submissionsUnder', '< {count} submissions', { count: MIN_PUBLIC_SAMPLE_SIZE })}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.seniorBand', 'Senior+ band')}</div>
                    <div className="px-4 py-3 text-sm">{roleAHasData ? formatMoney(roleCityA.senior_median_monthly_salary, numberLocale) : '-'}</div>
                    <div className="px-4 py-3 text-sm">{roleBHasData ? formatMoney(roleCityB.senior_median_monthly_salary, numberLocale) : '-'}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 border-t bg-muted/10">
                    <div className="px-4 py-3 text-sm font-medium">{t('salaryComparisonPage.table.lastUpdated', 'Last updated')}</div>
                    <div className="px-4 py-3 text-sm">{formatRefreshedDate(roleCityA.refreshed_at, dateLocale, t('salaryComparisonPage.common.unavailable', 'Unavailable'))}</div>
                    <div className="px-4 py-3 text-sm">{formatRefreshedDate(roleCityB.refreshed_at, dateLocale, t('salaryComparisonPage.common.unavailable', 'Unavailable'))}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">-</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <ContentShareButton
                    url={roleComparisonUrl}
                    title={tf(
                      'salaryComparisonPage.share.roleTitle',
                      'Salary comparison {role}: {cityA} vs {cityB}',
                      { role: selectedRole, cityA: cityA.city, cityB: cityB.city }
                    )}
                    text={tf(
                      'salaryComparisonPage.share.roleText',
                      'Salary comparison for {role} between {cityA} and {cityB}.',
                      { role: selectedRole, cityA: cityA.city, cityB: cityB.city }
                    )}
                    contentType="salary_role_city_comparison"
                    contentId={`${roleSlug}_${cityASlug}_${cityBSlug}`}
                    cardType="role_city_delta"
                  />
                </div>
              </div>
            </GatekeeperOverlay>
          )}
        </CardContent>
      </Card>

      <section className="rounded-2xl border p-6 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">{t('salaryComparisonPage.contribute.title', 'Contribute to the barometer')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('salaryComparisonPage.contribute.subtitle', 'Share your salary to unlock even deeper analysis.')}
          </p>
        </div>
        <Button asChild>
          <Link href="/salaires/partager">{t('salaryComparisonPage.contribute.cta', 'Share your salary')}</Link>
        </Button>
      </section>
    </div>
  );
}



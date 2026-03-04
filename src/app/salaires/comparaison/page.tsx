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
import { getServerSiteUrl } from '@/lib/site-config';

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

  const hasCompanyCompare = !!sp.companyA && !!sp.companyB;
  const hasRoleCompare = !!sp.role && !!sp.cityA && !!sp.cityB;

  let title = 'Comparaison entreprise: salaires et reputation';
  let description = 'Comparez les salaires et la reputation des entreprises au Maroc.';

  if (hasCompanyCompare) {
    const companyALabel = sp.companyALabel || 'Entreprise A';
    const companyBLabel = sp.companyBLabel || 'Entreprise B';
    title = `${companyALabel} vs ${companyBLabel} | Salaires et reputation`;
    description = `Comparez les tendances salariales et la reputation avis entre ${companyALabel} et ${companyBLabel} au Maroc.`;
  } else if (hasRoleCompare) {
    const roleLabel = sp.roleLabel || 'Poste';
    const cityALabel = sp.cityALabel || 'Ville A';
    const cityBLabel = sp.cityBLabel || 'Ville B';
    title = `${roleLabel}: ${cityALabel} vs ${cityBLabel} | Comparaison salariale`;
    description = `Comparez les salaires de ${roleLabel} entre ${cityALabel} et ${cityBLabel}.`;
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
      images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Comparaison salariale' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('fr-MA')} MAD`;
}

function formatRating(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Non defini';
  return `${value.toFixed(1)} / 5`;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}

function getConfidenceLabel(totalReviews: number | null | undefined) {
  const count = totalReviews ?? 0;
  if (count >= 60) return 'Confiance elevee';
  if (count >= 20) return 'Confiance moyenne';
  if (count > 0) return 'Confiance en construction';
  return 'Aucun avis';
}

function formatRefreshedDate(value: string | null | undefined) {
  if (!value) return 'Indisponible';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return 'Indisponible';
  return new Date(ts).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function SalaryComparisonPage({ searchParams }: PageProps) {
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
  const { data: comparedBusinesses } = isUnlocked && comparedBusinessIds.length
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Comparateur</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Comparaison: salaires et reputation</h1>
        <p className="text-muted-foreground">
          Comparez entreprise vs entreprise (salaires + avis) et role dans deux villes. URL partageable via les filtres.
        </p>
      </section>

      <InternalAdsSlot placement="salary_compare_top_banner" />

      <Card>
        <CardHeader>
          <CardTitle>Entreprise vs entreprise</CardTitle>
          <CardDescription>Comparez les salaires publies et la reputation basee sur les avis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select name="companyA" defaultValue={companyAId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner entreprise A</option>
              {previewCompanyMetrics.map((c) => (
                <option key={`a-${c.business_id}`} value={c.business_id}>{c.business_name}</option>
              ))}
            </select>
            <select name="companyB" defaultValue={companyBId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner entreprise B</option>
              {previewCompanyMetrics.map((c) => (
                <option key={`b-${c.business_id}`} value={c.business_id}>{c.business_name}</option>
              ))}
            </select>
            <Button type="submit">Comparer</Button>
          </form>

          {(!companyAId || !companyBId) && (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
              Selectionnez deux entreprises puis cliquez sur "Comparer".
            </p>
          )}

          {companyA && companyB && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">{companyA.business_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Mediane: <strong>{companyAHasData ? (isUnlocked ? formatMoney(companyA.median_monthly_salary) : 'Connectez-vous') : 'Donnees insuffisantes'}</strong></p>
                    <p>Moyenne: <strong>{companyAHasData ? (isUnlocked ? formatMoney(companyA.avg_monthly_salary) : 'Connectez-vous') : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}</strong></p>
                    <p>Vs ville: <strong>{companyAHasData ? (isUnlocked ? formatPct(companyA.pct_above_city_avg) : 'Connectez-vous') : '-'}</strong></p>
                    <p>Maj: <strong>{formatRefreshedDate(companyA.refreshed_at)}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">{companyB.business_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Mediane: <strong>{companyBHasData ? (isUnlocked ? formatMoney(companyB.median_monthly_salary) : 'Connectez-vous') : 'Donnees insuffisantes'}</strong></p>
                    <p>Moyenne: <strong>{companyBHasData ? (isUnlocked ? formatMoney(companyB.avg_monthly_salary) : 'Connectez-vous') : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}</strong></p>
                    <p>Vs ville: <strong>{companyBHasData ? (isUnlocked ? formatPct(companyB.pct_above_city_avg) : 'Connectez-vous') : '-'}</strong></p>
                    <p>Maj: <strong>{formatRefreshedDate(companyB.refreshed_at)}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Ecart median</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-bold">
                    {companyAHasData && companyBHasData
                      ? (isUnlocked ? `${companyGap >= 0 ? '+' : ''}${companyGap.toLocaleString('fr-MA')} MAD` : 'Connectez-vous')
                      : 'Donnees insuffisantes'}
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Reputation - {companyA.business_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Note moyenne: <strong>{isUnlocked ? formatRating(companyARating) : 'Connectez-vous'}</strong></p>
                    <p>Volume avis: <strong>{isUnlocked ? companyAReviewCount.toLocaleString('fr-MA') : 'Connectez-vous'}</strong></p>
                    <p>Confiance: <strong>{isUnlocked ? getConfidenceLabel(companyAReviewCount) : 'Connectez-vous'}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Reputation - {companyB.business_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Note moyenne: <strong>{isUnlocked ? formatRating(companyBRating) : 'Connectez-vous'}</strong></p>
                    <p>Volume avis: <strong>{isUnlocked ? companyBReviewCount.toLocaleString('fr-MA') : 'Connectez-vous'}</strong></p>
                    <p>Confiance: <strong>{isUnlocked ? getConfidenceLabel(companyBReviewCount) : 'Connectez-vous'}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Ecart reputation</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Note: <strong>{isUnlocked ? (reviewRatingGap === null ? 'Non defini' : `${reviewRatingGap >= 0 ? '+' : ''}${reviewRatingGap.toFixed(1)} / 5`) : 'Connectez-vous'}</strong></p>
                    <p>Volume avis: <strong>{isUnlocked ? `${reviewVolumeGap >= 0 ? '+' : ''}${reviewVolumeGap.toLocaleString('fr-MA')}` : 'Connectez-vous'}</strong></p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end">
                <ContentShareButton
                  url={companyComparisonUrl}
                  title={`Comparaison entreprise: ${companyA.business_name} vs ${companyB.business_name}`}
                  text={`Comparaison salaires et reputation entre ${companyA.business_name} et ${companyB.business_name}.`}
                  contentType="salary_company_comparison"
                  contentId={`${companyA.business_id}_${companyB.business_id}`}
                  cardType="company_delta"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role: ville A vs ville B</CardTitle>
          <CardDescription>Comparez un poste identique entre deux villes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select name="role" defaultValue={roleSlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner un role</option>
              {previewRoleCatalog.map((r) => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
            <select name="cityA" defaultValue={cityASlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner ville A</option>
              {previewCityMetrics.map((c) => (
                <option key={`ca-${c.city_slug}`} value={c.city_slug}>{c.city}</option>
              ))}
            </select>
            <select name="cityB" defaultValue={cityBSlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner ville B</option>
              {previewCityMetrics.map((c) => (
                <option key={`cb-${c.city_slug}`} value={c.city_slug}>{c.city}</option>
              ))}
            </select>
            <Button type="submit">Comparer</Button>
          </form>

          {(!roleSlug || !cityASlug || !cityBSlug) && (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
              Selectionnez un role et deux villes pour lancer la comparaison.
            </p>
          )}

          {selectedRole && roleCityA && roleCityB && cityA && cityB && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">{selectedRole} - {cityA.city}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Mediane: <strong>{roleAHasData ? (isUnlocked ? formatMoney(roleCityA.median_monthly_salary) : 'Connectez-vous') : 'Donnees insuffisantes'}</strong></p>
                    <p>Junior: <strong>{roleAHasData ? (isUnlocked ? formatMoney(roleCityA.junior_median_monthly_salary) : 'Connectez-vous') : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}</strong></p>
                    <p>Senior+: <strong>{roleAHasData ? (isUnlocked ? formatMoney(roleCityA.senior_median_monthly_salary) : 'Connectez-vous') : '-'}</strong></p>
                    <p>Maj: <strong>{formatRefreshedDate(roleCityA.refreshed_at)}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">{selectedRole} - {cityB.city}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Mediane: <strong>{roleBHasData ? (isUnlocked ? formatMoney(roleCityB.median_monthly_salary) : 'Connectez-vous') : 'Donnees insuffisantes'}</strong></p>
                    <p>Junior: <strong>{roleBHasData ? (isUnlocked ? formatMoney(roleCityB.junior_median_monthly_salary) : 'Connectez-vous') : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}</strong></p>
                    <p>Senior+: <strong>{roleBHasData ? (isUnlocked ? formatMoney(roleCityB.senior_median_monthly_salary) : 'Connectez-vous') : '-'}</strong></p>
                    <p>Maj: <strong>{formatRefreshedDate(roleCityB.refreshed_at)}</strong></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Ecart median</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-bold">
                    {roleAHasData && roleBHasData
                      ? (isUnlocked ? `${roleGap >= 0 ? '+' : ''}${roleGap.toLocaleString('fr-MA')} MAD` : 'Connectez-vous')
                      : 'Donnees insuffisantes'}
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end">
                <ContentShareButton
                  url={roleComparisonUrl}
                  title={`Comparaison salaire ${selectedRole}: ${cityA.city} vs ${cityB.city}`}
                  text={`Comparaison de salaire pour ${selectedRole} entre ${cityA.city} et ${cityB.city}.`}
                  contentType="salary_role_city_comparison"
                  contentId={`${roleSlug}_${cityASlug}_${cityBSlug}`}
                  cardType="role_city_delta"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isUnlocked && (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">Debloquez la comparaison detaillee</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isAuthenticated
              ? 'Partagez au moins un salaire pour debloquer les details junior/senior, les ecarts complets et les benchmarks avances.'
              : 'Creez un compte ou connectez-vous, puis partagez un salaire pour debloquer les details junior/senior, les ecarts complets et les benchmarks avances.'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            En mode apercu, les listes et indicateurs sont volontairement limites.
          </p>
          <Button asChild>
            <Link href={isAuthenticated ? '/salaires/partager' : '/login?next=/salaires/comparaison'}>
              {isAuthenticated ? 'Partager mon salaire' : 'Se connecter'}
            </Link>
          </Button>
        </section>
      )}

      <section className="rounded-2xl border p-6 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Contribuez au barometre</h2>
          <p className="text-sm text-muted-foreground">Partagez votre salaire pour debloquer des analyses encore plus fines.</p>
        </div>
        <Button asChild>
          <Link href="/salaires/partager">Partager votre salaire</Link>
        </Button>
      </section>
    </div>
  );
}

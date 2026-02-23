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

type SearchParams = {
  companyA?: string;
  companyB?: string;
  role?: string;
  cityA?: string;
  cityB?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Comparaison des salaires',
  description: 'Comparez les salaires entre entreprises et villes au Maroc.',
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('fr-MA')} MAD`;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}

export default async function SalaryComparisonPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUnlocked = !!user;

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

  const companyGap = (companyA?.median_monthly_salary ?? 0) - (companyB?.median_monthly_salary ?? 0);
  const roleGap = (roleCityA?.median_monthly_salary ?? 0) - (roleCityB?.median_monthly_salary ?? 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Comparateur</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Comparaison des salaires</h1>
        <p className="text-muted-foreground">
          Comparez entreprise vs entreprise et role dans deux villes. URL partageable via les filtres.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Entreprise vs entreprise</CardTitle>
          <CardDescription>Comparez les medians salariaux publies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select name="companyA" defaultValue={companyAId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner entreprise A</option>
              {companyMetrics.map((c) => (
                <option key={`a-${c.business_id}`} value={c.business_id}>{c.business_name}</option>
              ))}
            </select>
            <select name="companyB" defaultValue={companyBId} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner entreprise B</option>
              {companyMetrics.map((c) => (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{companyA.business_name}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Mediane: <strong>{formatMoney(companyA.median_monthly_salary)}</strong></p>
                  <p>Moyenne: <strong>{isUnlocked ? formatMoney(companyA.avg_monthly_salary) : 'Connectez-vous'}</strong></p>
                  <p>Vs ville: <strong>{isUnlocked ? formatPct(companyA.pct_above_city_avg) : 'Connectez-vous'}</strong></p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{companyB.business_name}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Mediane: <strong>{formatMoney(companyB.median_monthly_salary)}</strong></p>
                  <p>Moyenne: <strong>{isUnlocked ? formatMoney(companyB.avg_monthly_salary) : 'Connectez-vous'}</strong></p>
                  <p>Vs ville: <strong>{isUnlocked ? formatPct(companyB.pct_above_city_avg) : 'Connectez-vous'}</strong></p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Ecart median</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">
                  {isUnlocked ? `${companyGap >= 0 ? '+' : ''}${companyGap.toLocaleString('fr-MA')} MAD` : 'Connectez-vous'}
                </CardContent>
              </Card>
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
              {roleCatalog.map((r) => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
            <select name="cityA" defaultValue={cityASlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner ville A</option>
              {cityMetrics.map((c) => (
                <option key={`ca-${c.city_slug}`} value={c.city_slug}>{c.city}</option>
              ))}
            </select>
            <select name="cityB" defaultValue={cityBSlug} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="">Selectionner ville B</option>
              {cityMetrics.map((c) => (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{selectedRole} - {cityA.city}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Mediane: <strong>{formatMoney(roleCityA.median_monthly_salary)}</strong></p>
                  <p>Junior: <strong>{isUnlocked ? formatMoney(roleCityA.junior_median_monthly_salary) : 'Connectez-vous'}</strong></p>
                  <p>Senior+: <strong>{isUnlocked ? formatMoney(roleCityA.senior_median_monthly_salary) : 'Connectez-vous'}</strong></p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{selectedRole} - {cityB.city}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Mediane: <strong>{formatMoney(roleCityB.median_monthly_salary)}</strong></p>
                  <p>Junior: <strong>{isUnlocked ? formatMoney(roleCityB.junior_median_monthly_salary) : 'Connectez-vous'}</strong></p>
                  <p>Senior+: <strong>{isUnlocked ? formatMoney(roleCityB.senior_median_monthly_salary) : 'Connectez-vous'}</strong></p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Ecart median</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">
                  {isUnlocked ? `${roleGap >= 0 ? '+' : ''}${roleGap.toLocaleString('fr-MA')} MAD` : 'Connectez-vous'}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {!isUnlocked && (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">Debloquez la comparaison detaillee</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Creez un compte ou connectez-vous pour voir les details junior/senior, les ecarts complets et les benchmarks avances.
          </p>
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </section>
      )}

      <section className="rounded-2xl border p-6 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Contribuez au barometre</h2>
          <p className="text-sm text-muted-foreground">Partagez votre salaire pour debloquer des analyses encore plus fines.</p>
        </div>
        <Button asChild>
          <Link href="/businesses">Partager votre salaire</Link>
        </Button>
      </section>
    </div>
  );
}

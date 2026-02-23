import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getServerSiteUrl } from '@/lib/site-config';
import { getSalaryCityMetrics, getSalaryCitySectorMetrics } from '@/lib/data/salaries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

type Params = { sectorSlug: string; citySlug: string };

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('fr-MA')} MAD`;
}

async function loadSectorCityMetrics(sectorSlug: string, citySlug: string) {
  const rows = await getSalaryCitySectorMetrics({ sectorSlug, citySlug, limit: 1 });
  return rows[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { sectorSlug, citySlug } = await params;
  const metric = await loadSectorCityMetrics(sectorSlug, citySlug);
  if (!metric) {
    return { title: 'Secteur non trouve' };
  }

  const title = `Salaire secteur ${metric.sector_slug} a ${metric.city} | Barometre`;
  const description = `Median secteur ${metric.sector_slug} a ${metric.city}: ${formatMoney(metric.median_monthly_salary)}.`;
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

  const pctVsCity = city?.avg_monthly_salary
    ? Number((((metric.avg_monthly_salary || 0) - city.avg_monthly_salary) / city.avg_monthly_salary * 100).toFixed(2))
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Barometre des salaires</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Salaire secteur {metric.sector_slug} a {metric.city}
        </h1>
        <p className="text-muted-foreground">
          Donnees basees sur {metric.submission_count} soumissions publiees ({metric.business_count} entreprises).
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Mediane</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatMoney(metric.median_monthly_salary)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Fourchette</CardTitle></CardHeader>
          <CardContent className="text-lg font-bold">{isUnlocked ? `${formatMoney(metric.min_monthly_salary)} - ${formatMoney(metric.max_monthly_salary)}` : 'Connectez-vous'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vs moyenne ville</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{isUnlocked ? (pctVsCity === null ? '-' : `${pctVsCity}%`) : 'Connectez-vous'}</CardContent>
        </Card>
      </section>

      {isUnlocked ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Junior median</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold">{formatMoney(metric.junior_median_monthly_salary)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Senior+ median</CardTitle></CardHeader>
            <CardContent className="text-xl font-semibold">{formatMoney(metric.senior_median_monthly_salary)}</CardContent>
          </Card>
        </section>
      ) : (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">Debloquez les analyses detaillees</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connectez-vous pour voir la fourchette complete et les details junior/senior par secteur.
          </p>
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </section>
      )}

      <section className="flex gap-3">
        <Button asChild>
          <Link href="/salaires/partager">Partager votre salaire</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/salaires">Voir plus d'analyses</Link>
        </Button>
      </section>
    </div>
  );
}

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
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

type Params = { roleSlug: string; citySlug: string };

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('fr-MA')} MAD`;
}

function formatRefreshedDate(value: string | null | undefined) {
  if (!value) return 'Indisponible';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return 'Indisponible';
  return new Date(ts).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadRoleCityMetrics(roleSlug: string, citySlug: string) {
  const rows = await getSalaryRoleCityMetrics({ citySlug, limit: 300 });
  return rows.find((item) => slugify(item.job_title) === roleSlug) || null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { roleSlug, citySlug } = await params;
  const metric = await loadRoleCityMetrics(roleSlug, citySlug);
  if (!metric) {
    return { title: 'Salaire non trouve' };
  }

  const title = `Salaire ${metric.job_title} a ${metric.city} | Barometre`;
  const description = hasSufficientSampleSize(metric.submission_count)
    ? `Comparez ${metric.job_title} a ${metric.city} avec la moyenne nationale. Connectez-vous pour les valeurs detaillees.`
    : `Donnees insuffisantes (moins de ${MIN_PUBLIC_SAMPLE_SIZE} soumissions) pour afficher des valeurs detaillees sur ${metric.job_title} a ${metric.city}.`;
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
        <p className="text-sm text-muted-foreground">Barometre des salaires</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Salaire {metric.job_title} a {metric.city}
        </h1>
        <p className="text-muted-foreground">
          Donnees basees sur {metric.submission_count} soumissions publiees.
        </p>
        <p className="text-xs text-muted-foreground">Derniere mise a jour: {formatRefreshedDate(metric.refreshed_at)}</p>
      </section>

      <InternalAdsSlot
        placement="salary_role_city_inline"
        context={{ roleSlug, citySlug }}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Mediane</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {hasEnoughData
              ? (isUnlocked ? formatMoney(metric.median_monthly_salary) : 'Connectez-vous')
              : 'Donnees insuffisantes'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Fourchette</CardTitle></CardHeader>
          <CardContent className="text-lg font-bold">
            {hasEnoughData
              ? (isUnlocked ? `${formatMoney(metric.min_monthly_salary)} - ${formatMoney(metric.max_monthly_salary)}` : 'Connectez-vous')
              : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vs national</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {hasEnoughData
              ? (isUnlocked ? (metric.pct_vs_national_role_median === null ? '-' : `${metric.pct_vs_national_role_median}%`) : 'Connectez-vous')
              : 'Donnees insuffisantes'}
          </CardContent>
        </Card>
      </section>

      {isUnlocked && hasEnoughData ? (
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
          <h2 className="font-bold text-lg mb-1">{hasEnoughData ? 'Debloquez les analyses detaillees' : 'Donnees insuffisantes pour une statistique fiable'}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {hasEnoughData
              ? 'Connectez-vous pour voir la fourchette complete, les bandes junior/senior et la comparaison nationale.'
              : `Cette page affiche les details uniquement a partir de ${MIN_PUBLIC_SAMPLE_SIZE} soumissions pour proteger la confidentialite.`}
          </p>
          {hasEnoughData && (
            <Button asChild>
              <Link href={`/login?next=/salaires/role/${roleSlug}/${citySlug}`}>Se connecter</Link>
            </Button>
          )}
        </section>
      )}

      {city && (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">Contexte ville: {city.city}</h2>
          <p className="text-sm text-muted-foreground">
            Mediane ville: {isUnlocked ? formatMoney(city.median_monthly_salary) : 'Connectez-vous'} | Junior: {isUnlocked ? formatMoney(city.junior_median_monthly_salary) : 'Connectez-vous'} | Senior+: {isUnlocked ? formatMoney(city.senior_median_monthly_salary) : 'Connectez-vous'}
          </p>
        </section>
      )}

      <section className="flex gap-3">
        <Button asChild>
          <Link href="/salaires/partager">Partager votre salaire</Link>
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
          <Link href="/salaires">Voir plus d'analyses</Link>
        </Button>
      </section>
    </div>
  );
}

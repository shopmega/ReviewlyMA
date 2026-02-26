import Link from 'next/link';
import { getTopSalaryRoleCityPairs, getTopSalarySectorCityPairs } from '@/lib/data/salaries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { Metadata } from 'next';
import { getServerSiteUrl } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Barometre des salaires au Maroc',
  description: 'Consultez les salaires par role, ville et secteur au Maroc.',
};

export default async function SalariesIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isUnlocked = !!user;

  const [roleCityPairs, sectorCityPairs] = await Promise.all([
    getTopSalaryRoleCityPairs(24),
    getTopSalarySectorCityPairs(24),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-6 md:p-10">
        <div className="space-y-4 max-w-3xl">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Barometre</Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">Salaires au Maroc</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Visualisez les salaires par poste, ville et secteur. Donnees anonymisees basees sur les soumissions publiees.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/salaires/comparaison">Comparer les salaires</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/salaires/partager">Partager votre salaire</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Pages role + ville</CardTitle>
            <CardDescription>Postes les plus consultes avec mediane salariale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleCityPairs.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                Aucune donnee disponible pour le moment.
              </p>
            )}
            {roleCityPairs.map((item) => {
              const roleSlug = slugify(item.job_title);
              const hasEnoughData = hasSufficientSampleSize(item.submission_count);
              return (
                <Link
                  key={`${item.job_title}-${item.city_slug}`}
                  href={`/salaires/role/${roleSlug}/${item.city_slug}`}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-sky-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{item.job_title}</p>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {hasEnoughData
                        ? (isUnlocked ? `${item.median_monthly_salary?.toLocaleString('fr-MA') || '-'} MAD` : 'Apercu')
                        : 'Donnees insuffisantes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasEnoughData
                        ? (isUnlocked ? `${item.submission_count} donnees` : 'Connectez-vous pour details')
                        : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Pages secteur + ville</CardTitle>
            <CardDescription>Lecture marche par secteur avec mediane salariale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorCityPairs.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">
                Aucune donnee disponible pour le moment.
              </p>
            )}
            {sectorCityPairs.map((item) => (
              (() => {
                const hasEnoughData = hasSufficientSampleSize(item.submission_count);
                return (
                  <Link
                    key={`${item.sector_slug}-${item.city_slug}`}
                    href={`/salaires/secteur/${item.sector_slug}/${item.city_slug}`}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-emerald-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold">{item.sector_slug}</p>
                      <p className="text-xs text-muted-foreground">{item.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {hasEnoughData
                          ? (isUnlocked ? `${item.median_monthly_salary?.toLocaleString('fr-MA') || '-'} MAD` : 'Apercu')
                          : 'Donnees insuffisantes'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasEnoughData
                          ? (isUnlocked ? `${item.submission_count} donnees` : 'Connectez-vous pour details')
                          : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}
                      </p>
                    </div>
                  </Link>
                );
              })()
            ))}
          </CardContent>
        </Card>
      </section>

      {!isUnlocked && (
        <section className="rounded-2xl border p-5 bg-muted/20">
          <h2 className="font-bold text-lg mb-1">Mode apercu actif</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Vous voyez un apercu limite. Connectez-vous pour acceder aux valeurs detaillees et a la comparaison avancee.
          </p>
          <Button asChild>
            <Link href="/login?next=/salaires">Se connecter</Link>
          </Button>
        </section>
      )}

      <section className="rounded-2xl border p-6 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Contribuez au barometre</h2>
          <p className="text-muted-foreground">
            Partager votre salaire augmente la precision des statistiques et debloque des analyses plus utiles pour tous.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/salaires/partager">Partager votre salaire</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/salaires/comparaison">Outil de comparaison</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

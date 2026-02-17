import Link from 'next/link';
import { getTopSalaryRoleCityPairs, getTopSalarySectorCityPairs } from '@/lib/data/salaries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { Metadata } from 'next';
import { getServerSiteUrl } from '@/lib/site-config';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Barometre des salaires au Maroc',
  description: 'Consultez les salaires par role, ville et secteur au Maroc.',
};

export default async function SalariesIndexPage() {
  const [roleCityPairs, sectorCityPairs] = await Promise.all([
    getTopSalaryRoleCityPairs(24),
    getTopSalarySectorCityPairs(24),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      <section className="space-y-4">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Barometre</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Salaires au Maroc</h1>
        <p className="text-muted-foreground max-w-3xl">
          Explorez les niveaux de salaire par role, ville et secteur. Donnees anonymisees basees sur les soumissions publiees.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pages role + ville</CardTitle>
            <CardDescription>Les combinaisons les plus consultees pour le SEO et la comparaison.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleCityPairs.map((item) => {
              const roleSlug = slugify(item.job_title);
              return (
                <Link
                  key={`${item.job_title}-${item.city_slug}`}
                  href={`/salaires/role/${roleSlug}/${item.city_slug}`}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{item.job_title}</p>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.median_monthly_salary?.toLocaleString('fr-MA') || '-'} MAD</p>
                    <p className="text-xs text-muted-foreground">{item.submission_count} donnees</p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pages secteur + ville</CardTitle>
            <CardDescription>Vue marche locale par secteur avec mediane et amplitude.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectorCityPairs.map((item) => (
              <Link
                key={`${item.sector_slug}-${item.city_slug}`}
                href={`/salaires/secteur/${item.sector_slug}/${item.city_slug}`}
                className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p className="font-semibold">{item.sector_slug}</p>
                  <p className="text-xs text-muted-foreground">{item.city}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.median_monthly_salary?.toLocaleString('fr-MA') || '-'} MAD</p>
                  <p className="text-xs text-muted-foreground">{item.submission_count} donnees</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border p-6 bg-muted/20">
        <h2 className="text-xl font-bold mb-2">Contribuez au barometre</h2>
        <p className="text-muted-foreground mb-4">
          Partager votre salaire augmente la precision des statistiques et debloque des analyses plus utiles pour tous.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/businesses">Partager votre salaire</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/salaires/comparaison">Outil de comparaison</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

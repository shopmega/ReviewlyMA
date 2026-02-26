import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchAutocomplete } from '@/components/shared/SearchAutocomplete';
import { getCachedBusinesses } from '@/lib/cache';
import { getSiteSettings } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalaryQuickSubmitCard } from '@/components/salaries/SalaryQuickSubmitCard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Partager mon salaire',
  description: 'Choisissez une entreprise puis partagez votre salaire anonymement.',
};

export default async function ShareSalaryPage() {
  const [businessesResult, settings] = await Promise.all([
    getCachedBusinesses({ limit: 24, minimal: true }),
    getSiteSettings(),
  ]);
  const businesses = businessesResult.businesses || [];
  const latestBusinesses = [...businesses]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <section className="rounded-3xl border bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-6 md:p-10">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
            Soumission anonyme
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">Partager mon salaire</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Recherchez d'abord votre entreprise. Ensuite, vous pourrez publier votre salaire de facon anonyme sur sa fiche.
          </p>
          <div className="rounded-2xl border bg-background/80 p-3 md:p-4">
            <SearchAutocomplete
              placeholder="Rechercher une entreprise..."
              className="w-full"
              inputClassName="h-12 text-base"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Astuce: ouvrez la fiche puis allez a la section <strong>Salaires</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/businesses">Voir toutes les entreprises</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/suggest">Je ne trouve pas mon entreprise</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <SalaryQuickSubmitCard
          roles={settings.salary_roles || []}
          departments={settings.salary_departments || []}
          intervals={settings.salary_intervals || []}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Entreprises recentes</h2>
        <p className="text-sm text-muted-foreground">
          Vous pouvez commencer par une fiche recente puis cliquer sur la section salaires.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestBusinesses.map((business) => (
            <Card key={business.id} className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{business.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{business.city || business.location || 'Maroc'}</p>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/businesses/${business.id}?shareSalary=1#salaries`}>Ouvrir la fiche salaires</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

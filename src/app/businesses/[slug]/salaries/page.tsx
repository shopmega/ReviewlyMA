import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBusinessBySlug } from '@/lib/data/businesses';
import { getPublishedSalariesByBusiness, getSalaryStatsByBusiness } from '@/lib/data/salaries';
import { getServerSiteUrl } from '@/lib/site-config';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatMoneyMAD(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('fr-MA')} MAD`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const siteUrl = getServerSiteUrl();

  if (!business) {
    return {
      title: 'Salaires entreprise introuvable',
    };
  }

  const title = `Salaires chez ${business.name}${business.city ? ` a ${business.city}` : ''} | AVis`;
  const description = `Consultez les salaires anonymises publies pour ${business.name}${business.city ? ` a ${business.city}` : ''}. Donnees agregees et moderees.`;
  const canonical = `${siteUrl}/businesses/${business.id}/salaries`;
  const ogQuery = new URLSearchParams({
    name: business.name || '',
    city: business.city || '',
    category: business.category || '',
    rating: business.overallRating ? business.overallRating.toFixed(1) : '0.0',
    reviews: String(business.reviews?.length || 0),
  });
  const image = `${siteUrl}/api/og/company?${ogQuery.toString()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: `${business.name} - salaires` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function BusinessSalariesPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const [stats, salaries] = await Promise.all([
    getSalaryStatsByBusiness(business.id),
    getPublishedSalariesByBusiness(business.id, 20),
  ]);

  const hasEnoughData = hasSufficientSampleSize(stats.count);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Salaires</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Salaires chez {business.name}{business.city ? ` (${business.city})` : ''}
        </h1>
        <p className="text-muted-foreground">
          Donnees anonymisees basees sur les salaires publies par les contributeurs.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/businesses/${business.id}`}>Voir la fiche entreprise</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/businesses/${business.id}/reviews`}>Voir les avis</Link>
          </Button>
          <Button asChild>
            <Link href={`/businesses/${business.id}?tab=salaries&shareSalary=1#salaries`}>Partager mon salaire</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Mediane mensuelle</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">
            {hasEnoughData ? formatMoneyMAD(stats.medianMonthly) : 'Donnees insuffisantes'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Minimum mensuel</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">
            {hasEnoughData ? formatMoneyMAD(stats.minMonthly) : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Maximum mensuel</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">
            {hasEnoughData ? formatMoneyMAD(stats.maxMonthly) : `< ${MIN_PUBLIC_SAMPLE_SIZE} soumissions`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Echantillon</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">{stats.count} entrees</CardContent>
        </Card>
      </section>

      {stats.roleBreakdown.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Top postes</h2>
          <div className="space-y-2">
            {stats.roleBreakdown.map((row) => (
              <Card key={row.jobTitle}>
                <CardContent className="py-3 flex items-center justify-between">
                  <span>{row.jobTitle}</span>
                  <span className="font-semibold">
                    {hasEnoughData ? `${formatMoneyMAD(row.medianMonthly)} (${row.count})` : 'Donnees insuffisantes'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Dernieres entrees publiees</h2>
        {salaries.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Aucune entree salaire publiee pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {salaries.map((row) => (
              <Card key={row.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.job_title}</p>
                    <p className="font-semibold">
                      {hasEnoughData ? formatMoneyMAD(row.salary_monthly_normalized || row.salary) : 'Donnees insuffisantes'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.location || business.city || 'Maroc'} - {new Date(row.created_at).toLocaleDateString('fr-MA')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

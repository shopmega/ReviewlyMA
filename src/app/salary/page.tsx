import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSiteUrl } from '@/lib/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Salary Intelligence | Reviewly MA',
    description: 'Salary cluster entry point for role/city intelligence pages.',
    alternates: { canonical: `${siteUrl}/salary` },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function SalaryHubPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-3">
        <Badge variant="outline" className="w-fit">Salary Intelligence</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Salary cluster hub</h1>
        <p className="text-muted-foreground max-w-3xl">
          Point d&apos;entree de la nouvelle architecture salary. Les templates role/city seront ajoutes ici avec garde-fous
          d&apos;indexation.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Transition en cours</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Les pages salaires actuellement en production restent accessibles via <code>/salaires</code> pendant la migration.
          </p>
          <Button asChild>
            <Link href="/salaires">Voir les pages salaires existantes</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/referral-demand">Referral demand hub</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/companies">Company insights</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">Monthly reports</Link>
        </Button>
      </div>
    </div>
  );
}

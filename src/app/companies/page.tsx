import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSiteUrl } from '@/lib/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Company Referral Insights | Reviewly MA',
    description: 'Company-level referral demand and insights cluster.',
    alternates: { canonical: `${siteUrl}/companies` },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function CompanyHubPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-3">
        <Badge variant="outline" className="w-fit">Company Insights</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Company referral cluster</h1>
        <p className="text-muted-foreground max-w-3xl">
          Cette section recevra les pages <code>/companies/[company]/referrals</code> avec indexation conditionnelle selon le
          volume et l&apos;activite.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Transition en cours</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Les pages entreprise de parrainage en production sont actuellement sous <code>/parrainages/entreprise/*</code>.
          </p>
          <Button asChild>
            <Link href="/parrainages">Explorer les offres de parrainage</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/referral-demand">Referral demand hub</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/salary">Salary intelligence</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">Monthly reports</Link>
        </Button>
      </div>
    </div>
  );
}

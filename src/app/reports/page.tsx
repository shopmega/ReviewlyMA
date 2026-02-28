import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarRange, ChartColumnBig, Link2 } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { buildMonthlyReferralReportSlug } from '@/lib/report-period';
import { ENABLE_REPORTS_HUB_INDEXING } from '@/lib/seo-ia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Reports | Reviewly MA',
    description: 'Periodic referral market reports and cluster summaries.',
    alternates: { canonical: `${siteUrl}/reports` },
    robots: {
      index: ENABLE_REPORTS_HUB_INDEXING,
      follow: true,
    },
  };
}

export default function ReportsHubPage() {
  const currentReportSlug = buildMonthlyReferralReportSlug(new Date());

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-3">
        <Badge variant="outline" className="w-fit">Reports Hub</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Periodic referral reports</h1>
        <p className="text-muted-foreground max-w-3xl">
          Les pages de rapports mensuels et trimestriels seront publiees ici, avec des liens vers les clusters demand, salary,
          company insights et playbooks.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4" />
              Monthly report
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Revue des signaux demande + salaires, mise a jour chaque mois.
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <ChartColumnBig className="h-4 w-4" />
              Quarterly review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Consolidation des tendances et performance SEO par cluster.
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Cluster links
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Chaque rapport renforce le maillage interne entre les pages data et les guides.
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/referral-demand">Ouvrir le live dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/reports/${currentReportSlug}`}>Voir le rapport du mois</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/parrainages/demandes">Voir la demande active actuelle</Link>
        </Button>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = { reportSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { reportSlug } = await params;

  return {
    title: `Retired report | ${reportSlug}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function RetiredReportPage({ params }: { params: Promise<Params> }) {
  const { reportSlug } = await params;

  return (
    <div className="container mx-auto space-y-8 px-4 py-12 md:px-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 md:p-8">
        <Badge variant="outline" className="w-fit">
          Report retired
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          This referral-era report is no longer part of the live product
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          The job referrals module is being decommissioned. Historical report routes remain as retirement placeholders while archival
          and retention decisions are finalized.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/blog">
              Open blog
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/companies">Browse companies</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Retirement status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Legacy report slug: <span className="font-mono text-foreground">{reportSlug}</span></p>
          <p>No new referral reporting data should be published from this route.</p>
          <p>Any historical referral data that still exists should be treated as archival, not active marketplace intelligence.</p>
        </CardContent>
      </Card>
    </div>
  );
}

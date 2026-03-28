import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerTranslator } from '@/lib/i18n/server';

type Params = { company: string };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Referral module retired',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CompanyReferralsPage({ params }: { params: Promise<Params> }) {
  const { t } = await getServerTranslator();
  const { company } = await params;

  return (
    <div className="container mx-auto space-y-8 px-4 py-12 md:px-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 md:p-8">
        <Badge variant="outline" className="w-fit">
          {t('business.referrals.badge', 'Connections')}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Referral activity retired
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          The referral module is being retired. New referral actions are disabled, and this route is no longer part of the live user workflow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/companies">
              Browse companies
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/companies/${company}`}>Open company page</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Decommission notice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Historical referral data may remain in internal storage during archival and retention work.</p>
          <p>User-facing referral discovery and interaction paths are being removed rather than expanded.</p>
        </CardContent>
      </Card>
    </div>
  );
}

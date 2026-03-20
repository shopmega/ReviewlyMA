import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Job Offer Analysis',
  description: 'Analyze job offers with a dedicated standalone module.',
};

export default function JobOffersHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <section className="rounded-[2rem] border bg-gradient-to-br from-orange-50 via-background to-sky-50 p-8 md:p-12">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline" className="uppercase tracking-[0.18em] text-[10px]">
            New module
          </Badge>
          <h1 className="text-4xl font-black tracking-tight">Job offer analysis</h1>
          <p className="text-base text-muted-foreground md:text-lg">
            A dedicated module for evaluating offers from structured inputs, URLs, and documents against market benchmarks.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/job-offers/analyze">Start an analysis</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/job-offers/history">My analyses</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Structured result</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Get compensation, market fit, transparency, quality, and confidence in one explainable result.
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Standalone domain</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This module has its own schema, actions, routes, and analytics instead of living inside salaries or referrals.
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Future ingestion</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            URL and PDF inputs are modeled now; extraction and parsing will be added on top of the current foundation.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

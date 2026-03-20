import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMyJobOfferAnalyses } from '@/lib/data/job-offers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'My Job Offer Analyses',
  description: 'Review previously saved job offer analyses.',
};

export default async function JobOfferHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Login required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>You need an account to access saved analyses.</p>
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analyses = await getMyJobOfferAnalyses();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My analyses</h1>
          <p className="text-sm text-muted-foreground">Saved outputs from the standalone job-offers module.</p>
        </div>
        <Button asChild>
          <Link href="/job-offers/analyze">Analyze another offer</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {analyses.length > 0 ? analyses.map((item) => (
          <Card key={item.id} className="rounded-3xl">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.job_offers.company_name}</p>
                <h2 className="text-xl font-bold">{item.job_offers.job_title}</h2>
                <p className="text-sm text-muted-foreground">
                  {item.job_offers.city || 'Unknown city'} • {item.market_position_label.replace(/_/g, ' ')} • score {Math.round(item.overall_offer_score)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/job-offers/${item.id}`}>Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="rounded-3xl">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No analyses yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

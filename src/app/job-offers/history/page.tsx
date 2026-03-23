import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMyJobOfferAnalyses } from '@/lib/data/job-offers';
import { JobOfferHistoryClient } from '@/components/job-offers/JobOfferHistoryClient';
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

  const analyses = await getMyJobOfferAnalyses(50);

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

      {analyses.length > 0 ? (
        <JobOfferHistoryClient analyses={analyses} />
      ) : (
        <div className="grid gap-4">
          <Card className="rounded-3xl">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No analyses yet.
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

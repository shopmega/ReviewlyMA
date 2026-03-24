import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMyJobOfferAnalyses } from '@/lib/data/job-offers';
import { JobOfferHistoryClient } from '@/components/job-offers/JobOfferHistoryClient';
import { AppEmptyState } from '@/components/shared/AppEmptyState';
import { Button } from '@/components/ui/button';
import { FileSearch, LogIn } from 'lucide-react';

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
        <AppEmptyState
          className="rounded-3xl"
          icon={<LogIn className="h-8 w-8 text-muted-foreground" />}
          title="Login required"
          description="You need an account to access saved analyses."
          action={
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          }
        />
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
        <AppEmptyState
          className="rounded-3xl"
          icon={<FileSearch className="h-8 w-8 text-muted-foreground" />}
          title="No analyses yet"
          description="Run your first offer analysis to start building a private history."
          action={
            <Button asChild>
              <Link href="/job-offers/analyze">Start an analysis</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { JobOfferAnalysisForm } from '@/components/job-offers/JobOfferAnalysisForm';

export const metadata: Metadata = {
  title: 'Analyze Job Offer',
  description: 'Paste a job offer text or URL and receive an explainable market analysis.',
};

export default async function AnalyzeJobOfferPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {!user ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          You need to be logged in to run and save job offer analyses in this module.
          <div className="mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <JobOfferAnalysisForm />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { JobOfferAnalysisForm } from '@/components/job-offers/JobOfferAnalysisForm';
import { getServerTranslator } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('jobOffers.analyze.metadata.title', 'Analyze Job Offer'),
    description: t('jobOffers.analyze.metadata.description', 'Paste a job offer text or URL and receive an explainable market analysis.'),
  };
}

export default async function AnalyzeJobOfferPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { t } = await getServerTranslator();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {!user ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          {t('jobOffers.analyze.loginRequired', 'You need to be logged in to run and save job offer analyses in this module.')}
          <div className="mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link href="/login">{t('auth.login', 'Log in')}</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <JobOfferAnalysisForm />
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobOfferDecisionWorkspace } from '@/lib/data/job-offers';
import { JobOfferAnalysisResult } from '@/components/job-offers/JobOfferAnalysisResult';
import { getServerTranslator } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('jobOffers.detail.metadata.title', 'Job Offer Analysis Detail'),
    description: t('jobOffers.detail.metadata.description', 'View a saved job offer analysis.'),
  };
}

export default async function JobOfferAnalysisDetailPage(
  props: { params: Promise<{ analysisId: string }> }
) {
  const params = await props.params;
  const workspace = await getJobOfferDecisionWorkspace(params.analysisId);

  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <JobOfferAnalysisResult workspace={workspace} analysisId={params.analysisId} />
    </div>
  );
}

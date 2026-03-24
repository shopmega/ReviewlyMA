import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobOfferDecisionWorkspace } from '@/lib/data/job-offers';
import { JobOfferAnalysisResult } from '@/components/job-offers/JobOfferAnalysisResult';

export const metadata: Metadata = {
  title: 'Job Offer Analysis Detail',
  description: 'View a saved job offer analysis.',
};

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

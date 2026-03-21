import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJobOfferAnalysisById } from '@/lib/data/job-offers';
import { Button } from '@/components/ui/button';
import { JobOfferAnalysisResult } from '@/components/job-offers/JobOfferAnalysisResult';

export const metadata: Metadata = {
  title: 'Job Offer Analysis Detail',
  description: 'View a saved job offer analysis.',
};

export default async function JobOfferAnalysisDetailPage(
  props: { params: Promise<{ analysisId: string }> }
) {
  const params = await props.params;
  const record = await getJobOfferAnalysisById(params.analysisId);

  if (!record) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{record.offer.company_name}</p>
          <h1 className="text-3xl font-black tracking-tight">{record.offer.job_title}</h1>
          <p className="text-sm text-muted-foreground">
            {record.offer.city || 'Unknown city'} - source {record.offer.source_type}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/job-offers/history">Back to history</Link>
        </Button>
      </div>

      <JobOfferAnalysisResult analysis={record.analysis} offer={record.offer} />
    </div>
  );
}

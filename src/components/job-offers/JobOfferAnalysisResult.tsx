import Link from 'next/link';
import type { JobOfferAnalysisRecord, JobOfferExtractionResult } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-sky-600';
  if (score >= 45) return 'text-amber-600';
  return 'text-rose-600';
}

type Props = {
  analysis: Omit<JobOfferAnalysisRecord, 'id' | 'job_offer_id' | 'created_at'>;
  extractedOffer?: JobOfferExtractionResult;
  analysisId?: string;
};

export function JobOfferAnalysisResult({ analysis, extractedOffer, analysisId }: Props) {
  return (
    <div className="space-y-4">
      {extractedOffer ? (
        <Card className="rounded-3xl border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle className="text-lg">Extracted offer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <p><span className="font-semibold">Company:</span> {extractedOffer.companyName}</p>
            <p><span className="font-semibold">Role:</span> {extractedOffer.jobTitle}</p>
            <p><span className="font-semibold">City:</span> {extractedOffer.city || 'Unknown'}</p>
            <p><span className="font-semibold">Pay period:</span> {extractedOffer.payPeriod}</p>
            <p><span className="font-semibold">Salary:</span> {extractedOffer.salaryMin ?? '-'} {extractedOffer.salaryMax ? `to ${extractedOffer.salaryMax}` : ''}</p>
            <p><span className="font-semibold">Contract:</span> {extractedOffer.contractType || 'Not specified'}</p>
            <p><span className="font-semibold">Work model:</span> {extractedOffer.workModel || 'Not specified'}</p>
            <p><span className="font-semibold">Seniority:</span> {extractedOffer.seniorityLevel || 'Not specified'}</p>
            <p className="md:col-span-2"><span className="font-semibold">Summary:</span> {extractedOffer.sourceSummary}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-3xl border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 uppercase tracking-[0.18em] text-[10px]">
              Offer result
            </Badge>
            <CardTitle className="text-2xl font-black tracking-tight">
              {analysis.market_position_label.replace(/_/g, ' ')}
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{analysis.analysis_summary}</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black ${scoreTone(analysis.overall_offer_score)}`}>
              {Math.round(analysis.overall_offer_score)}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Confidence {analysis.confidence_level}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Compensation</p>
            <p className="mt-2 text-2xl font-bold">{Math.round(analysis.compensation_score)}</p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Market fit</p>
            <p className="mt-2 text-2xl font-bold">{Math.round(analysis.market_alignment_score)}</p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Transparency</p>
            <p className="mt-2 text-2xl font-bold">{Math.round(analysis.transparency_score)}</p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quality</p>
            <p className="mt-2 text-2xl font-bold">{Math.round(analysis.quality_score)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Strengths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {analysis.strengths.length > 0 ? analysis.strengths.map((item) => (
              <p key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800">
                {item}
              </p>
            )) : (
              <p className="text-muted-foreground">No standout strengths were detected yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Risks and missing info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {analysis.missing_information.map((item) => (
              <p key={item} className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-amber-900">
                {item}
              </p>
            ))}
            {analysis.risk_flags.map((flag) => (
              <p key={flag} className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-900">
                {flag.replace(/_/g, ' ')}
              </p>
            ))}
            {analysis.missing_information.length === 0 && analysis.risk_flags.length === 0 ? (
              <p className="text-muted-foreground">No major risks were flagged.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {analysisId ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/job-offers/${analysisId}`}>Open saved analysis</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/job-offers/history">View my history</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

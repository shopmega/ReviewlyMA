import { ExternalLink } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';
import { EmployerSignalBadge } from '@/components/job-offers/workspace/EmployerSignalBadge';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function EmployerContextCard({ workspace }: Props) {
  const context = workspace.employerContext;
  const full = context.availability === 'full' && !!context.business_slug;

  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="employer-step">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">Employer context</CardTitle>
      </CardHeader>
      <CardContent>
        {context.availability === 'unavailable' ? (
          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            {context.signal_summary}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EmployerSignalBadge signal={context.signal_label} />
              <Badge variant="outline">
                {context.review_count} review{context.review_count === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline">{context.is_claimed ? 'Claimed' : 'Unclaimed'}</Badge>
              {context.verification_badge_level && context.verification_badge_level !== 'none' ? (
                <Badge variant="outline">Verified</Badge>
              ) : null}
              {context.availability === 'limited' ? (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                  Limited mapping confidence
                </Badge>
              ) : null}
            </div>

            <p className="max-w-3xl text-sm leading-7 text-slate-700">{context.signal_summary}</p>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Rating', value: context.overall_rating != null ? context.overall_rating.toFixed(1) : 'N/A' },
                { label: 'Reviews', value: String(context.review_count) },
                { label: 'Claimed', value: context.is_claimed ? 'Yes' : 'No' },
                { label: 'Company size', value: context.company_size || 'Unknown' },
                { label: 'Salary reputation', value: context.salary_median_monthly != null ? `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(context.salary_median_monthly)} MAD` : 'Limited data' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            {full ? (
              <div className="flex flex-wrap gap-3">
                <TrackedActionButton
                  href={`/businesses/${context.business_slug}/reviews`}
                  ctaId="employer_context_reviews"
                  placement="employer_context"
                  context="job_offer_result"
                  businessId={context.business_id}
                  variant="outline"
                >
                  <>
                    View company reviews
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                </TrackedActionButton>
                <TrackedActionButton
                  href={`/businesses/${context.business_slug}`}
                  ctaId="employer_context_company_page"
                  placement="employer_context"
                  context="job_offer_result"
                  businessId={context.business_id}
                  variant="outline"
                >
                  <>
                    Open company page
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                </TrackedActionButton>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

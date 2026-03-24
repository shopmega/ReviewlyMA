import { ArrowRight } from 'lucide-react';
import type { JobOfferSimilarOffer } from '@/lib/types';
import { formatSalary, formatWords } from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';

type Props = {
  offer: JobOfferSimilarOffer;
};

export function SimilarOfferCard({ offer }: Props) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{offer.similarity_label}</Badge>
        <span className="text-sm font-bold text-slate-900">{Math.round(offer.overall_offer_score)}</span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{offer.company_name}</p>
      <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">{offer.job_title}</h3>
      <p className="mt-2 text-sm text-slate-600">{offer.city || 'Unknown city'}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <p>{offer.salary_min == null && offer.salary_max == null ? 'Salary not shown' : formatSalary({
          salaryMin: offer.salary_min ?? null,
          salaryMax: offer.salary_max ?? null,
          payPeriod: offer.pay_period,
        })}</p>
        <p>{formatWords(offer.market_position_label)}</p>
        <p>Similarity score: {offer.similarity_score}</p>
      </div>
      {offer.public_href ? (
        <TrackedActionButton
          href={offer.public_href}
          ctaId="open_similar_offer_public_surface"
          placement="similar_offers"
          context="job_offer_result"
          businessId={offer.business_id}
          variant="outline"
          size="sm"
          className="mt-4 w-full"
        >
          <>
            Open public context
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        </TrackedActionButton>
      ) : null}
    </div>
  );
}

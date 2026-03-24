import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimilarOfferCard } from '@/components/job-offers/workspace/SimilarOfferCard';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function SimilarOffersList({ workspace }: Props) {
  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="compare-step">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">How this compares to similar offers</CardTitle>
      </CardHeader>
      <CardContent>
        {workspace.similarOffers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workspace.similarOffers.map((item) => <SimilarOfferCard key={item.analysis_id} offer={item} />)}
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            No strong comparable offers are visible yet for this role and market combination. When more approved analyses accumulate, this section becomes comparison evidence rather than guesswork.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

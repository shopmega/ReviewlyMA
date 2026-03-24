import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { getToneClasses } from '@/lib/job-offers/workspace';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function ReviewAwareSignalBanner({ workspace }: Props) {
  if (!workspace.reviewAwareSignal) return null;

  const tone = getToneClasses(workspace.reviewAwareSignal.tone);

  return (
    <Card className={`rounded-[1.8rem] border shadow-sm ${tone.surface}`}>
      <CardContent className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Review-aware interpretation</p>
        <h3 className="mt-2 text-xl font-black tracking-tight">{workspace.reviewAwareSignal.title}</h3>
        <p className="mt-2 text-sm leading-7">{workspace.reviewAwareSignal.body}</p>
      </CardContent>
    </Card>
  );
}

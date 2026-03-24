import { ArrowRight } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function DynamicCtaRail({ workspace }: Props) {
  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">Dynamic next actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.dynamicActions.map((action) => (
          <div key={action.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {action.kind === 'primary' ? 'Primary action' : 'Next action'}
            </p>
            <p className="mt-2 text-lg font-black tracking-tight text-slate-950">{action.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
            <TrackedActionButton
              href={action.href}
              ctaId={action.cta_id}
              placement="dynamic_actions"
              context="job_offer_result"
              businessId={workspace.employerContext.business_id}
              variant={action.kind === 'primary' ? 'default' : 'outline'}
              size="sm"
              className="mt-4"
            >
              <>
                Open
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            </TrackedActionButton>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

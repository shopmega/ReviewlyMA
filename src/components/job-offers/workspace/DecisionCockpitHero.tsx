import { ArrowRight, ShieldAlert } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import {
  formatBenchmarkSource,
  formatSalary,
  formatSourceType,
  formatWorkModel,
  getToneClasses,
} from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function DecisionCockpitHero({ workspace }: Props) {
  const tone = getToneClasses(workspace.verdict.tone);
  const primaryAction = workspace.primaryAction;

  return (
    <Card className={`overflow-hidden rounded-[2rem] border shadow-sm ${tone.surface}`}>
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={tone.badge}>
                AI-powered decision cockpit
              </Badge>
              <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                {formatSourceType(workspace.snapshot.sourceType)}
              </Badge>
              <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                {formatBenchmarkSource(workspace.analysis.benchmark_primary_source)}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {workspace.verdict.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {workspace.verdict.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                {workspace.verdict.summary}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickStat title="Best signal" body={workspace.positives[0] || 'The offer includes at least a few structured details instead of being completely opaque.'} />
              <QuickStat title="Main concern" body={workspace.concerns[0] || 'There is no major red flag here, but several decision-critical details still need confirmation.'} />
              <QuickStat title="What is missing" body={workspace.missingInformation[0]?.title ? `${workspace.missingInformation[0].title}. ${workspace.missingInformation[0].insight}` : 'Most core fields are visible, but package and reporting details should still be verified.'} />
              <QuickStat title="Best next step" body={workspace.nextStep} />
            </div>
          </div>

          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Assessment confidence
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {workspace.confidence.label}
                </p>
              </div>
              <ShieldAlert className="h-5 w-5 text-slate-500" />
            </div>
            <Progress value={workspace.confidence.score} className="mt-4 h-2.5 border-slate-200 bg-white" />
            <p className="mt-3 text-sm leading-6 text-slate-600">{workspace.confidence.note}</p>

            <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Visible salary</span>
                <span className="font-semibold text-slate-900">{formatSalary(workspace.snapshot)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold text-slate-900">{workspace.snapshot.city || 'Unclear'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Work model</span>
                <span className="font-semibold text-slate-900">{formatWorkModel(workspace.snapshot.workModel)}</span>
              </div>
            </div>

            {primaryAction ? (
              <div className="mt-5 rounded-[1.3rem] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primary next action</p>
                <p className="mt-2 text-base font-bold text-slate-950">{primaryAction.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{primaryAction.body}</p>
                <TrackedActionButton
                  href={primaryAction.href}
                  ctaId={primaryAction.cta_id}
                  placement="job_offer_primary_action"
                  context="job_offer_result"
                  businessId={workspace.employerContext.business_id}
                  className="mt-4 w-full"
                >
                  <>
                    Open next step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                </TrackedActionButton>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStat({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

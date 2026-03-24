import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { getSalaryPresentation } from '@/lib/job-offers/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function OfferInsightsSplit({ workspace }: Props) {
  const salaryPresentation = getSalaryPresentation(workspace.snapshot, workspace.extractionDiagnostics);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-tight">Positives vs concerns</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SignalList
            title="Positive signals"
            tone="border-emerald-200 bg-emerald-50/70"
            items={workspace.positives}
            fallback="The offer has at least enough structure to support a useful review."
          />
          <SignalList
            title="Concerns"
            tone="border-rose-200 bg-rose-50/70"
            items={workspace.concerns}
            fallback="No major concern stands out yet, but key details still need verification."
          />
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-tight">Decision dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-[1.2rem] border px-4 py-4 ${
            salaryPresentation.tone === 'positive' ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
          }`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{salaryPresentation.label}</p>
            <p className="mt-2 text-base font-bold text-slate-950">{salaryPresentation.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{salaryPresentation.note}</p>
          </div>

          {workspace.dimensions.map((dimension) => (
            <div key={dimension.title} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{dimension.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{dimension.label}</p>
                </div>
                <span className="text-sm font-bold text-slate-900">{dimension.value}</span>
              </div>
              <Progress value={dimension.value} className="mt-3 h-2 bg-white" />
              <p className="mt-2 text-sm leading-6 text-slate-600">{dimension.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SignalList({
  title,
  tone,
  items,
  fallback,
}: {
  title: string;
  tone: string;
  items: string[];
  fallback: string;
}) {
  return (
    <div className={`rounded-[1.2rem] border p-4 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-3 space-y-3">
        {(items.length > 0 ? items : [fallback]).map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-700">{item}</p>
        ))}
      </div>
    </div>
  );
}

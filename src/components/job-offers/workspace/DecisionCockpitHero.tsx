'use client';

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
import { useI18n } from '@/components/providers/i18n-provider';
import { VerdictBanner } from '@/components/job-offers/workspace/VerdictBanner';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function DecisionCockpitHero({ workspace }: Props) {
  const { t } = useI18n();
  const tone = getToneClasses(workspace.verdict.tone);
  const primaryAction = workspace.primaryAction;

  return (
    <Card className={`overflow-hidden rounded-[2rem] border shadow-sm ${tone.surface}`}>
      <CardContent className="space-y-6 p-6 md:p-8">
        {/* Decision verdict — most prominent block */}
        <VerdictBanner workspace={workspace} />

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={tone.badge}>
                {t('jobOffers.workspace.cockpit.aiCockpit', 'AI-powered decision cockpit')}
              </Badge>
              <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                {t(formatSourceType(workspace.snapshot.sourceType))}
              </Badge>
              <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                {t(formatBenchmarkSource(workspace.analysis.benchmark_primary_source))}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickStat title={t('jobOffers.workspace.cockpit.stats.bestSignal', 'Best signal')} body={t(workspace.positives[0]) || t('jobOffers.workspace.cockpit.fallbacks.positive', 'The offer includes at least a few structured details instead of being completely opaque.')} />
              <QuickStat title={t('jobOffers.workspace.cockpit.stats.mainConcern', 'Main concern')} body={t(workspace.concerns[0]) || t('jobOffers.workspace.cockpit.fallbacks.concern', 'There is no major red flag here, but several decision-critical details still need confirmation.')} />
              <QuickStat title={t('jobOffers.workspace.cockpit.stats.whatIsMissing', 'What is missing')} body={workspace.missingInformation[0]?.title ? `${t(workspace.missingInformation[0].title)}. ${t(workspace.missingInformation[0].insight)}` : t('jobOffers.workspace.cockpit.fallbacks.missing', 'Most core fields are visible, but package and reporting details should still be verified.')} />
              <QuickStat title={t('jobOffers.workspace.cockpit.stats.nextStep', 'Best next step')} body={t(workspace.nextStep)} />
            </div>
          </div>

          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t('jobOffers.workspace.cockpit.assessmentConfidence', 'Assessment confidence')}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {t(workspace.confidence.label)}
                </p>
              </div>
              <ShieldAlert className="h-5 w-5 text-slate-500" />
            </div>
            <Progress value={workspace.confidence.score} className="mt-4 h-2.5 border-slate-200 bg-white" />
            <p className="mt-3 text-sm leading-6 text-slate-600">{t(workspace.confidence.note)}</p>

            <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{t('jobOffers.workspace.cockpit.visibleSalary', 'Visible salary')}</span>
                <span className="font-semibold text-slate-900">{t(formatSalary(workspace.snapshot))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{t('jobOffers.workspace.cockpit.location', 'Location')}</span>
                <span className="font-semibold text-slate-900">{workspace.snapshot.city || t('jobOffers.result.locationUnclear', 'Unclear')}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{t('jobOffers.workspace.cockpit.workModel', 'Work model')}</span>
                <span className="font-semibold text-slate-900">{t(formatWorkModel(workspace.snapshot.workModel))}</span>
              </div>
            </div>

            {primaryAction ? (
              <div className="mt-5 rounded-[1.3rem] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('jobOffers.workspace.cockpit.primaryNextAction', 'Primary next action')}</p>
                <p className="mt-2 text-base font-bold text-slate-950">{t(primaryAction.title)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(primaryAction.body)}</p>
                <TrackedActionButton
                  href={primaryAction.href}
                  ctaId={primaryAction.cta_id}
                  placement="job_offer_primary_action"
                  context="job_offer_result"
                  businessId={workspace.employerContext.business_id}
                  className="mt-4 w-full"
                >
                  <>
                    {t('jobOffers.workspace.cockpit.openNextStep', 'Open next step')}
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

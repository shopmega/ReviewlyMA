'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { JobOfferDecisionWorkspace, JobOfferDecisionWorkspaceStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatSourceType } from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/providers/i18n-provider';
import { DecisionCockpitHero } from '@/components/job-offers/workspace/DecisionCockpitHero';
import { DiagnosticsAccordion } from '@/components/job-offers/workspace/DiagnosticsAccordion';
import { DynamicCtaRail } from '@/components/job-offers/workspace/DynamicCtaRail';
import { EmployerContextCard } from '@/components/job-offers/workspace/EmployerContextCard';
import { MissingInfoPanel } from '@/components/job-offers/workspace/MissingInfoPanel';
import { NegotiationScriptPanel } from '@/components/job-offers/workspace/NegotiationScriptPanel';
import { OfferFactsGrid } from '@/components/job-offers/workspace/OfferFactsGrid';
import { OfferInsightsSplit } from '@/components/job-offers/workspace/OfferInsightsSplit';
import { OutcomeFollowupCard } from '@/components/job-offers/workspace/OutcomeFollowupCard';
import { RecruiterQuestionsPanel } from '@/components/job-offers/workspace/RecruiterQuestionsPanel';
import { ReviewAwareSignalBanner } from '@/components/job-offers/workspace/ReviewAwareSignalBanner';
import { ShareableVerdictCard } from '@/components/job-offers/workspace/ShareableVerdictCard';
import { SimilarOffersList } from '@/components/job-offers/workspace/SimilarOffersList';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';

type ResultStepKey = JobOfferDecisionWorkspaceStep['key'];

type Props = {
  workspace: JobOfferDecisionWorkspace;
  analysisId?: string;
};

const JOURNEY_STEPS = [
  'jobOffers.form.steps.source',
  'jobOffers.form.steps.extraction',
  'jobOffers.form.steps.generation',
  'jobOffers.form.steps.workspace',
  'jobOffers.form.steps.save',
] as const;

export function JobOfferAnalysisResult({ workspace, analysisId }: Props) {
  const { t, tf } = useI18n();
  const [activeStep, setActiveStep] = useState<ResultStepKey>('offer');
  const activeIndex = workspace.resultSteps.findIndex((step) => step.key === activeStep);
  const currentStep = workspace.resultSteps[activeIndex] ?? workspace.resultSteps[0];

  useEffect(() => {
    setActiveStep('offer');
  }, [analysisId, workspace.snapshot.companyName, workspace.snapshot.jobTitle]);

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="uppercase tracking-[0.18em] text-[10px]">
                  {t('jobOffers.result.aiJobAnalysis', 'AI-powered job offer analysis')}
                </Badge>
                <Badge variant="outline">{t('jobOffers.result.privateDecisionWorkspace', 'Private decision workspace')}</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{workspace.snapshot.jobTitle}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{workspace.snapshot.companyName}</span>
                <span className="text-slate-300">/</span>
                <span>{workspace.snapshot.city || t('jobOffers.result.locationUnclear', 'Location unclear')}</span>
                <span className="text-slate-300">/</span>
                <span>{t(formatSourceType(workspace.snapshot.sourceType))}</span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {t('jobOffers.result.decisionSupportNote', 'AI helps extract and structure the offer, then combines it with market and employer context. This is decision support, not ground truth.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisId ? (
                <TrackedActionButton
                  href={`/job-offers/${analysisId}`}
                  ctaId="open_saved_analysis_header"
                  placement="job_offer_header"
                  context="job_offer_result"
                  businessId={workspace.employerContext.business_id}
                  size="sm"
                >
                  <>{t('jobOffers.result.savedAnalysis', 'Saved analysis')}</>
                </TrackedActionButton>
              ) : null}
              <TrackedActionButton
                href="/job-offers/history"
                ctaId="view_history_header"
                placement="job_offer_header"
                context="job_offer_result"
                variant="outline"
                size="sm"
              >
                <>{t('jobOffers.result.history', 'History')}</>
              </TrackedActionButton>
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {tf('jobOffers.result.journeyStepLabel', 'Journey step {current} of {total}', { current: workspace.journey.currentStep, total: workspace.journey.totalSteps })}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-5">
              {JOURNEY_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-sm',
                    index + 1 < workspace.journey.currentStep && 'border-emerald-200 bg-emerald-50 text-emerald-950',
                    index + 1 === workspace.journey.currentStep && 'border-slate-900 bg-slate-950 text-white',
                    index + 1 > workspace.journey.currentStep && 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {tf('jobOffers.form.step', 'Step {index}', { index: index + 1 })}
                  </p>
                  <p className="mt-1 font-medium">{t(step)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {tf('jobOffers.result.resultStepLabel', 'Result step {current} of {total}', { current: activeIndex + 1, total: workspace.resultSteps.length })}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{t(currentStep.title)}</p>
                <p className="mt-1 text-sm text-slate-600">{t(currentStep.body)}</p>
              </div>
              <Badge variant="outline" className="bg-white text-slate-700">
                {t(currentStep.label)}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {workspace.resultSteps.map((step, index) => {
                const isActive = step.key === activeStep;
                const isComplete = index < activeIndex;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setActiveStep(step.key)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-slate-900 bg-slate-950 text-white'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 bg-white text-slate-700'
                    )}
                  >
                    {t(step.label)}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {activeStep === 'offer' ? (
        <>
          <DecisionCockpitHero workspace={workspace} />
          <OfferFactsGrid workspace={workspace} />
          <OfferInsightsSplit workspace={workspace} />
          <MissingInfoPanel workspace={workspace} />
        </>
      ) : null}

      {activeStep === 'employer' ? (
        <>
          <EmployerContextCard workspace={workspace} />
          <ReviewAwareSignalBanner workspace={workspace} />
        </>
      ) : null}

      {activeStep === 'compare' ? <SimilarOffersList workspace={workspace} /> : null}

      {activeStep === 'actions' ? (
        <>
          <DynamicCtaRail workspace={workspace} />
          {/* Negotiation generator — shown when verdict is NEGOTIATE or AVOID */}
          <NegotiationScriptPanel workspace={workspace} />
          <RecruiterQuestionsPanel workspace={workspace} />
        </>
      ) : null}

      {activeStep === 'details' ? <DiagnosticsAccordion workspace={workspace} /> : null}

      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {tf('jobOffers.result.journeyStepLabel', 'Step {current} of {total}', { current: workspace.journey.totalSteps, total: workspace.journey.totalSteps })}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t(workspace.journey.finalStepTitle)}. {t('jobOffers.result.footerNote', 'Keep this analysis private, compare it with alternatives, and come back after recruiter follow-up.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveStep(workspace.resultSteps[Math.max(activeIndex - 1, 0)].key)}
            disabled={activeIndex === 0}
          >
            {t('jobOffers.result.previousStep', 'Previous step')}
          </Button>
          <Button
            type="button"
            onClick={() => setActiveStep(workspace.resultSteps[Math.min(activeIndex + 1, workspace.resultSteps.length - 1)].key)}
            disabled={activeIndex === workspace.resultSteps.length - 1}
          >
            {t('jobOffers.result.nextStep', 'Next step')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <TrackedActionButton href="/job-offers/history" ctaId="view_history" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>{t('jobOffers.result.viewHistory', 'View my history')}</>
        </TrackedActionButton>
        <TrackedActionButton href="/job-offers/analyze" ctaId="analyze_another" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>
            {t('jobOffers.result.analyzeAnother', 'Analyze another offer')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        </TrackedActionButton>
        {/* Shareable verdict card */}
        <ShareableVerdictCard workspace={workspace} analysisId={analysisId} />
      </div>

      {/* Outcome follow-up loop — only shown for saved analyses */}
      {analysisId ? <OutcomeFollowupCard analysisId={analysisId} /> : null}
    </div>
  );
}

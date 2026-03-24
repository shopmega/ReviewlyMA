'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { JobOfferDecisionWorkspace, JobOfferDecisionWorkspaceStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatSourceType } from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DecisionCockpitHero } from '@/components/job-offers/workspace/DecisionCockpitHero';
import { DiagnosticsAccordion } from '@/components/job-offers/workspace/DiagnosticsAccordion';
import { DynamicCtaRail } from '@/components/job-offers/workspace/DynamicCtaRail';
import { EmployerContextCard } from '@/components/job-offers/workspace/EmployerContextCard';
import { MissingInfoPanel } from '@/components/job-offers/workspace/MissingInfoPanel';
import { OfferFactsGrid } from '@/components/job-offers/workspace/OfferFactsGrid';
import { OfferInsightsSplit } from '@/components/job-offers/workspace/OfferInsightsSplit';
import { RecruiterQuestionsPanel } from '@/components/job-offers/workspace/RecruiterQuestionsPanel';
import { ReviewAwareSignalBanner } from '@/components/job-offers/workspace/ReviewAwareSignalBanner';
import { SimilarOffersList } from '@/components/job-offers/workspace/SimilarOffersList';
import { TrackedActionButton } from '@/components/job-offers/TrackedActionButton';

type ResultStepKey = JobOfferDecisionWorkspaceStep['key'];

type Props = {
  workspace: JobOfferDecisionWorkspace;
  analysisId?: string;
};

const JOURNEY_STEPS = [
  'Source input',
  'AI extraction',
  'Analysis generation',
  'Decision workspace',
  'Save and follow up',
] as const;

export function JobOfferAnalysisResult({ workspace, analysisId }: Props) {
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
                  AI-powered job offer analysis
                </Badge>
                <Badge variant="outline">Private decision workspace</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{workspace.snapshot.jobTitle}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{workspace.snapshot.companyName}</span>
                <span className="text-slate-300">/</span>
                <span>{workspace.snapshot.city || 'Location unclear'}</span>
                <span className="text-slate-300">/</span>
                <span>{formatSourceType(workspace.snapshot.sourceType)}</span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                AI helps extract and structure the offer, then combines it with market and employer context. This is decision support, not ground truth.
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
                  <>Saved analysis</>
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
                <>History</>
              </TrackedActionButton>
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Journey step {workspace.journey.currentStep} of {workspace.journey.totalSteps}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Step {index + 1}</p>
                  <p className="mt-1 font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Result step {activeIndex + 1} of {workspace.resultSteps.length}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{currentStep.title}</p>
                <p className="mt-1 text-sm text-slate-600">{currentStep.body}</p>
              </div>
              <Badge variant="outline" className="bg-white text-slate-700">
                {currentStep.label}
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
                    {step.label}
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
          <RecruiterQuestionsPanel workspace={workspace} />
        </>
      ) : null}

      {activeStep === 'details' ? <DiagnosticsAccordion workspace={workspace} /> : null}

      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Step {workspace.journey.totalSteps} of {workspace.journey.totalSteps}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {workspace.journey.finalStepTitle}. Keep this analysis private, compare it with alternatives, and come back after recruiter follow-up.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveStep(workspace.resultSteps[Math.max(activeIndex - 1, 0)].key)}
            disabled={activeIndex === 0}
          >
            Previous step
          </Button>
          <Button
            type="button"
            onClick={() => setActiveStep(workspace.resultSteps[Math.min(activeIndex + 1, workspace.resultSteps.length - 1)].key)}
            disabled={activeIndex === workspace.resultSteps.length - 1}
          >
            Next step
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <TrackedActionButton href="/job-offers/history" ctaId="view_history" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>View my history</>
        </TrackedActionButton>
        <TrackedActionButton href="/job-offers/analyze" ctaId="analyze_another" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>
            Analyze another offer
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        </TrackedActionButton>
      </div>
    </div>
  );
}

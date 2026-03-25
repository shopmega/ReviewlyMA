'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, CheckCircle2, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { submitJobOfferAnalysis, type JobOfferActionState } from '@/app/actions/job-offers';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/providers/i18n-provider';

const initialState: JobOfferActionState = { status: 'idle', message: '' };
const loadingStates = [
  {
    title: 'jobOffers.form.loadingStep2.title',
    fallbackTitle: 'Step 2 of 5: AI is reading the source',
    body: 'jobOffers.form.loadingStep2.body',
    fallbackBody: 'We are extracting the visible role, company, salary, and work conditions from the offer.',
  },
  {
    title: 'jobOffers.form.loadingStep2Alt.title',
    fallbackTitle: 'Step 2 of 5: Structuring what is clear',
    body: 'jobOffers.form.loadingStep2Alt.body',
    fallbackBody: 'AI is identifying missing fields, confidence levels, and what still needs verification.',
  },
  {
    title: 'jobOffers.form.loadingStep3.title',
    fallbackTitle: 'Step 3 of 5: Comparing with market and employer signals',
    body: 'jobOffers.form.loadingStep3.body',
    fallbackBody: 'We are checking benchmarks, employer mapping, and any similar offer context available.',
  },
  {
    title: 'jobOffers.form.loadingStep3Alt.title',
    fallbackTitle: 'Step 3 of 5: Building your decision workspace',
    body: 'jobOffers.form.loadingStep3Alt.body',
    fallbackBody: 'Your verdict, next actions, recruiter questions, and context blocks are being prepared.',
  },
] as const;

const journeySteps = [
  'jobOffers.form.steps.source',
  'jobOffers.form.steps.extraction',
  'jobOffers.form.steps.generation',
  'jobOffers.form.steps.workspace',
  'jobOffers.form.steps.save',
] as const;

function FieldError({ state, name }: { state: JobOfferActionState; name: string }) {
  const fieldErrors =
    (state.errors as Record<string, string[] | undefined> | undefined)
    || (state.details?.fieldErrors as Record<string, string[] | undefined> | undefined);
  const errors = fieldErrors?.[name];
  if (!errors?.length) return null;
  return <p className="text-sm text-rose-600">{errors[0]}</p>;
}

export function JobOfferAnalysisForm() {
  const { t, tf } = useI18n();
  const router = useRouter();
  const [sourceType, setSourceType] = useState<'paste' | 'url'>('paste');
  const [state, formAction, isPending] = useActionState(submitJobOfferAnalysis, initialState);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lastTrackedAnalysisId = useRef<string | null>(null);
  const activeJourneyStep = isPending ? (loadingIndex >= 2 ? 3 : 2) : 1;

  useEffect(() => {
    if (state.status !== 'success' || !state.data?.analysisId || lastTrackedAnalysisId.current === state.data.analysisId) {
      return;
    }

    analytics.track('job_offer_analyzed', {
      analysis_id: state.data.analysisId,
      source_type: sourceType,
      market_position_label: state.data.analysis?.market_position_label,
      confidence_level: state.data.analysis?.confidence_level,
    });
    lastTrackedAnalysisId.current = state.data.analysisId;
    router.push(`/job-offers/${state.data.analysisId}`);
  }, [router, sourceType, state.data?.analysis, state.data?.analysisId, state.status]);

  useEffect(() => {
    if (!isPending) {
      setLoadingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingStates.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPending]);

  return (
    <div className="space-y-6">
      {/* Quick Analyze card — default, minimal friction */}
      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit uppercase tracking-[0.18em] text-[10px]">
            {t('jobOffers.form.aiPowered', 'AI-powered analysis')}
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight md:text-4xl">
            {t('jobOffers.form.quickMode.title', 'Should I accept this job offer?')}
          </CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t('jobOffers.form.decodeDesc', 'Paste the offer or drop a link. AI extracts everything, checks market benchmarks, and gives you a clear verdict in seconds.')}
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="sourceType" value={sourceType} />

            {/* Source input — minimal */}
            <section className="space-y-4 rounded-[1.8rem] border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('jobOffers.form.source', 'Source')}</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{t('jobOffers.form.provideOffer', 'Provide the offer')}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {t('jobOffers.form.provideOfferDesc', 'Paste the announcement text or switch to a public link. After analysis, the result opens on its own page.')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'paste' ? 'default' : 'outline'}
                    onClick={() => setSourceType('paste')}
                  >
                    {t('jobOffers.form.pasteText', 'Paste text')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'url' ? 'default' : 'outline'}
                    onClick={() => setSourceType('url')}
                  >
                    {t('jobOffers.form.useLink', 'Use link')}
                  </Button>
                </div>
              </div>

              {sourceType === 'paste' ? (
                <section className="space-y-2">
                  <Label htmlFor="sourceText">{t('jobOffers.form.jobOfferText', 'Job offer text')}</Label>
                  <Textarea
                    id="sourceText"
                    name="sourceText"
                    placeholder={t('jobOffers.form.pastePlaceholder', 'Paste a LinkedIn, Rekrute, Indeed, or Emploi.ma job post here...')}
                    className="min-h-56"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('jobOffers.form.pasteDesc', 'Best for copied job ads, screenshots transcribed to text, or incomplete posts you still want to pressure-test.')}
                  </p>
                  <FieldError state={state} name="sourceText" />
                </section>
              ) : (
                <section className="space-y-2">
                  <Label htmlFor="sourceUrl">{t('jobOffers.form.publicLink', 'Public job offer link')}</Label>
                  <Input
                    id="sourceUrl"
                    name="sourceUrl"
                    placeholder={t('jobOffers.form.linkPlaceholder', 'https://www.linkedin.com/jobs/view/...')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('jobOffers.form.linkDesc', 'Works when the source page is public and readable. If extraction is partial, AI still returns useful follow-up questions.')}
                  </p>
                  <FieldError state={state} name="sourceUrl" />
                </section>
              )}
            </section>

            {/* Advanced options — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                {showAdvanced
                  ? <><ChevronUp className="h-3.5 w-3.5" /> {t('jobOffers.form.hideAdvanced', 'Hide advanced options')}</>
                  : <><ChevronDown className="h-3.5 w-3.5" /> {t('jobOffers.form.advancedOptions', 'Advanced options →')}</>
                }
              </button>

              {showAdvanced && (
                <div className="mt-4 rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-4 md:p-5">
                  {/* Journey steps — visible in advanced mode */}
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {tf('jobOffers.form.journeyStep', 'Journey step {current} of 5', { current: 1, total: 5 })}
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    {journeySteps.map((step, index) => (
                      <div
                        key={step}
                        className={`rounded-2xl border px-3 py-3 text-sm ${
                          index + 1 < activeJourneyStep
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                            : index + 1 === activeJourneyStep
                              ? 'border-slate-900 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {tf('jobOffers.form.step', 'Step {index}', { index: index + 1 })}
                        </p>
                        <p className="mt-1 font-medium">{t(step)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {state.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPending} size="lg" className="font-bold">
                {isPending ? t('jobOffers.form.statusInProgress', 'AI analysis in progress...') : t('jobOffers.form.statusIdle', 'Analyze with AI')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>{t('jobOffers.form.decisionSupport', 'AI-powered decision support')}</span>
              <span>{t('jobOffers.form.privateAnalysis', 'Private analysis')}</span>
              <span>{t('jobOffers.form.loginToSave', 'Login required to save and compare results')}</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {isPending ? (
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t('jobOffers.form.aiPowered', 'AI-powered analysis')}</Badge>
                  <Badge variant="outline">{t('jobOffers.form.privateWorkspace', 'Private workspace')}</Badge>
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {t(loadingStates[loadingIndex].title, loadingStates[loadingIndex].fallbackTitle)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t(loadingStates[loadingIndex].body, loadingStates[loadingIndex].fallbackBody)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {loadingStates.map((item, index) => (
                <div
                  key={item.title}
                  className={`rounded-[1.3rem] border px-4 py-4 transition-colors ${
                    index <= loadingIndex
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {index < loadingIndex ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : index === loadingIndex ? (
                      <Bot className="h-4 w-4 text-slate-950" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-slate-400" />
                    )}
                    <p className="text-sm font-semibold text-slate-900">
                      {t(item.title, item.fallbackTitle)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {t(item.body, item.fallbackBody)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              {t('jobOffers.form.incompleteNote', 'Some offers are incomplete. AI will still surface useful questions, confidence levels, and the best next action instead of pretending the evidence is stronger than it is.')}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

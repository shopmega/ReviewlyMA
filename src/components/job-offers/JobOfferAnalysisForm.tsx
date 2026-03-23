'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { submitJobOfferAnalysis, type JobOfferActionState } from '@/app/actions/job-offers';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { JobOfferAnalysisResult } from './JobOfferAnalysisResult';

const initialState: JobOfferActionState = { status: 'idle', message: '' };
const loadingStates = [
  {
    title: 'AI is reading the source',
    body: 'We are extracting the visible role, company, salary, and work conditions from the offer.',
  },
  {
    title: 'Structuring what is clear',
    body: 'AI is identifying missing fields, confidence levels, and what still needs verification.',
  },
  {
    title: 'Comparing with market and employer signals',
    body: 'We are checking benchmarks, employer mapping, and any similar offer context available.',
  },
  {
    title: 'Building your decision workspace',
    body: 'Your verdict, next actions, recruiter questions, and context blocks are being prepared.',
  },
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
  const [sourceType, setSourceType] = useState<'paste' | 'url'>('paste');
  const [state, formAction, isPending] = useActionState(submitJobOfferAnalysis, initialState);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const lastTrackedAnalysisId = useRef<string | null>(null);
  const analysis = state.data?.analysis;
  const extractedOffer = state.data?.extractedOffer;
  const extractionDiagnostics = state.data?.extractionDiagnostics as Record<string, unknown> | undefined;
  const debugInfo = state.details?.debug as Record<string, unknown> | undefined;
  const flowSteps = [
    {
      key: 'input',
      label: 'Input',
      title: 'Provide the offer',
      body: 'Paste the text or add a public link to start the AI-powered review.',
    },
    {
      key: 'processing',
      label: 'AI processing',
      title: 'Extraction and validation',
      body: 'AI reads the source, structures the fields, checks confidence, and looks for benchmarks.',
    },
    {
      key: 'workspace',
      label: 'Workspace',
      title: 'Decision workspace',
      body: 'The result becomes a step-by-step workspace with verdict, employer context, and comparisons.',
    },
    {
      key: 'followup',
      label: 'Follow-up',
      title: 'Save and act',
      body: 'Use the analysis to compare offers, open employer context, and decide what to do next.',
    },
  ] as const;
  const activeFlowIndex = isPending ? 1 : analysis ? 2 : 0;
  const completedFlowIndex = analysis ? 3 : activeFlowIndex;

  useEffect(() => {
    if (state.status !== 'success' || !state.data?.analysisId || lastTrackedAnalysisId.current === state.data.analysisId) {
      return;
    }

    analytics.track('job_offer_analyzed', {
      analysis_id: state.data.analysisId,
      source_type: sourceType,
      market_position_label: analysis?.market_position_label,
      confidence_level: analysis?.confidence_level,
    });
    lastTrackedAnalysisId.current = state.data.analysisId;
  }, [analysis?.confidence_level, analysis?.market_position_label, sourceType, state.data?.analysisId, state.status]);

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
      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit uppercase tracking-[0.18em] text-[10px]">
            AI-powered analysis
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight md:text-4xl">
            Decode a job offer before you commit
          </CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            AI extracts the offer, checks market signals, and turns the result into a private multi-step decision workspace.
          </p>
        </CardHeader>
        <CardContent>
          <section className="mb-8 space-y-4 rounded-[1.8rem] border border-slate-200 bg-slate-50/70 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase tracking-[0.18em] text-[10px]">
                Guided AI workflow
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
                Private analysis
              </Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              {flowSteps.map((step, index) => {
                const isActive = index === activeFlowIndex;
                const isComplete = index < completedFlowIndex;

                return (
                  <div
                    key={step.key}
                    className={`rounded-[1.4rem] border px-4 py-4 transition-colors ${
                      isActive
                        ? 'border-slate-900 bg-white shadow-sm'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-white/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {step.label}
                      </p>
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : isActive ? (
                        <Bot className="h-4 w-4 text-slate-950" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{step.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <form action={formAction} className="space-y-8">
            <input type="hidden" name="sourceType" value={sourceType} />

            <section className="grid gap-4 md:grid-cols-3">
              {[
                { step: '01', title: 'Input the offer', body: 'Paste text or add a public link.' },
                { step: '02', title: 'AI reads and validates it', body: 'Extraction, confidence, employer match, and benchmark checks.' },
                { step: '03', title: 'Decision workspace appears', body: 'Offer verdict, employer context, similar offers, and next actions.' },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step {item.step}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <Label htmlFor="sourceText">Texte de l&apos;offre</Label>
              <Textarea
                id="sourceText"
                name="sourceText"
                placeholder="Collez ici le texte d'une annonce LinkedIn, Rekrute, Indeed, Emploi.ma..."
                className="min-h-72"
              />
              <FieldError state={state} name="sourceText" />
            </section>

            <section className="space-y-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Ou collez un lien d&apos;annonce</p>
                  <p className="text-xs text-muted-foreground">
                    Fonctionne pour les liens publics quand la page peut etre lue.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'paste' ? 'default' : 'outline'}
                    onClick={() => setSourceType('paste')}
                  >
                    Texte
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'url' ? 'default' : 'outline'}
                    onClick={() => setSourceType('url')}
                  >
                    Lien
                  </Button>
                </div>
              </div>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                placeholder="https://www.linkedin.com/jobs/view/..."
                disabled={sourceType !== 'url'}
              />
              <FieldError state={state} name="sourceUrl" />
            </section>

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {state.message}
              </div>
            ) : null}

            {state.status === 'error' && debugInfo ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Debug</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            ) : null}

            {state.status === 'success' && extractionDiagnostics ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Extraction diagnostics</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                  {JSON.stringify(extractionDiagnostics, null, 2)}
                </pre>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "AI analysis in progress..." : "Analyze with AI"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Works even when the offer is incomplete</span>
              <span>Private AI analysis</span>
              <span>Login required to save and compare your results</span>
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
                  <Badge variant="outline">AI-powered analysis</Badge>
                  <Badge variant="outline">Private workspace</Badge>
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {loadingStates[loadingIndex].title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {loadingStates[loadingIndex].body}
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
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Some offers are incomplete. AI will still surface useful questions, confidence levels, and the best next action instead of pretending the evidence is stronger than it is.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {analysis ? (
        <JobOfferAnalysisResult
          analysis={analysis}
          extractedOffer={extractedOffer}
          extractionDiagnostics={state.data?.extractionDiagnostics}
          analysisId={state.data?.analysisId}
          employerContext={state.data?.employerContext}
          similarOffers={state.data?.similarOffers}
        />
      ) : null}
    </div>
  );
}

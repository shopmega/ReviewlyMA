'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { submitJobOfferAnalysis, type JobOfferActionState } from '@/app/actions/job-offers';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const initialState: JobOfferActionState = { status: 'idle', message: '' };
const loadingStates = [
  {
    title: 'Step 2 of 5: AI is reading the source',
    body: 'We are extracting the visible role, company, salary, and work conditions from the offer.',
  },
  {
    title: 'Step 2 of 5: Structuring what is clear',
    body: 'AI is identifying missing fields, confidence levels, and what still needs verification.',
  },
  {
    title: 'Step 3 of 5: Comparing with market and employer signals',
    body: 'We are checking benchmarks, employer mapping, and any similar offer context available.',
  },
  {
    title: 'Step 3 of 5: Building your decision workspace',
    body: 'Your verdict, next actions, recruiter questions, and context blocks are being prepared.',
  },
] as const;

const journeySteps = [
  'Source input',
  'AI extraction',
  'Analysis generation',
  'Decision workspace',
  'Save and follow up',
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
  const router = useRouter();
  const [sourceType, setSourceType] = useState<'paste' | 'url'>('paste');
  const [state, formAction, isPending] = useActionState(submitJobOfferAnalysis, initialState);
  const [loadingIndex, setLoadingIndex] = useState(0);
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
      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Journey step 1 of 5</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Step {index + 1}</p>
                <p className="mt-1 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          <form action={formAction} className="space-y-8">
            <input type="hidden" name="sourceType" value={sourceType} />

            <section className="space-y-4 rounded-[1.8rem] border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">Provide the offer</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Paste the announcement text or switch to a public link. After analysis, the result opens on its own page.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'paste' ? 'default' : 'outline'}
                    onClick={() => setSourceType('paste')}
                  >
                    Paste text
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sourceType === 'url' ? 'default' : 'outline'}
                    onClick={() => setSourceType('url')}
                  >
                    Use link
                  </Button>
                </div>
              </div>

              {sourceType === 'paste' ? (
                <section className="space-y-2">
                  <Label htmlFor="sourceText">Job offer text</Label>
                  <Textarea
                    id="sourceText"
                    name="sourceText"
                    placeholder="Paste a LinkedIn, Rekrute, Indeed, or Emploi.ma job post here..."
                    className="min-h-72"
                  />
                  <p className="text-xs text-muted-foreground">
                    Best for copied job ads, screenshots transcribed to text, or incomplete posts you still want to pressure-test.
                  </p>
                  <FieldError state={state} name="sourceText" />
                </section>
              ) : (
                <section className="space-y-2">
                  <Label htmlFor="sourceUrl">Public job offer link</Label>
                  <Input
                    id="sourceUrl"
                    name="sourceUrl"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Works when the source page is public and readable. If extraction is partial, AI still returns useful follow-up questions.
                  </p>
                  <FieldError state={state} name="sourceUrl" />
                </section>
              )}
            </section>

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {state.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "AI analysis in progress..." : "Analyze with AI"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>AI-powered decision support</span>
              <span>Private analysis</span>
              <span>Login required to save and compare results</span>
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
    </div>
  );
}

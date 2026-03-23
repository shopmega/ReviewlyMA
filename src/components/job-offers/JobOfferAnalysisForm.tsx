'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const lastTrackedAnalysisId = useRef<string | null>(null);
  const analysis = state.data?.analysis;
  const extractedOffer = state.data?.extractedOffer;
  const extractionDiagnostics = state.data?.extractionDiagnostics as Record<string, unknown> | undefined;
  const debugInfo = state.details?.debug as Record<string, unknown> | undefined;

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

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit uppercase tracking-[0.18em] text-[10px]">
            Decision support
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight md:text-4xl">
            Decode a job offer before you commit
          </CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            See what the offer says, what it avoids saying, where the risk sits, and what to ask before applying.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-8">
            <input type="hidden" name="sourceType" value={sourceType} />

            <section className="grid gap-4 md:grid-cols-4">
              {[
                '10-second verdict',
                'Missing info decoded',
                'Questions to ask',
                'Confidence explained',
              ].map((item) => (
                <div key={item} className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
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
                {isPending ? "Analyse en cours..." : "Analyser l'offre"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Fonctionne meme si l&apos;annonce est incomplete</span>
              <span>Analyse privee</span>
              <span>
                Connexion requise pour analyser et enregistrer vos resultats
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {analysis ? (
        <JobOfferAnalysisResult
          analysis={analysis}
          extractedOffer={extractedOffer}
          extractionDiagnostics={state.data?.extractionDiagnostics}
          analysisId={state.data?.analysisId}
        />
      ) : null}
    </div>
  );
}

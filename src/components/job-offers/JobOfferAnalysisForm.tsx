'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { submitJobOfferAnalysis, type JobOfferActionState } from '@/app/actions/job-offers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { JobOfferAnalysisResult } from './JobOfferAnalysisResult';

const initialState: JobOfferActionState = { status: 'idle', message: '' };

function FieldError({ state, name }: { state: JobOfferActionState; name: string }) {
  const fieldErrors = state.errors as Record<string, string[] | undefined> | undefined;
  const errors = fieldErrors?.[name];
  if (!errors?.length) return null;
  return <p className="text-sm text-rose-600">{errors[0]}</p>;
}

export function JobOfferAnalysisForm() {
  const [sourceType, setSourceType] = useState<'paste' | 'url'>('paste');
  const [state, formAction, isPending] = useActionState(submitJobOfferAnalysis, initialState);
  const analysis = state.data?.analysis;
  const extractedOffer = state.data?.extractedOffer;

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit uppercase tracking-[0.18em] text-[10px]">
            Ingestion first
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight">Paste a job offer or a URL</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Drop the raw offer text or a job URL. The module extracts structured fields first, then runs benchmark-based analysis.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-8">
            <input type="hidden" name="sourceType" value={sourceType} />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={sourceType === 'paste' ? 'default' : 'outline'}
                onClick={() => setSourceType('paste')}
              >
                Paste text
              </Button>
              <Button
                type="button"
                variant={sourceType === 'url' ? 'default' : 'outline'}
                onClick={() => setSourceType('url')}
              >
                Paste URL
              </Button>
            </div>

            {sourceType === 'paste' ? (
              <section className="space-y-2">
                <Label htmlFor="sourceText">Job offer text</Label>
                <Textarea
                  id="sourceText"
                  name="sourceText"
                  placeholder="Paste the full job description, recruiter message, or offer text here."
                  className="min-h-64"
                />
                <FieldError state={state} name="sourceText" />
              </section>
            ) : (
              <section className="space-y-2">
                <Label htmlFor="sourceUrl">Offer URL</Label>
                <Input
                  id="sourceUrl"
                  name="sourceUrl"
                  placeholder="https://www.linkedin.com/jobs/view/..."
                />
                <FieldError state={state} name="sourceUrl" />
                <p className="text-xs text-muted-foreground">
                  The extractor will fetch the page content and try to recover the job information. Some websites may block access.
                </p>
              </section>
            )}

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {state.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Extracting and analyzing...' : 'Extract and analyze'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/job-offers/history">View my history</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {analysis ? (
        <JobOfferAnalysisResult
          analysis={analysis}
          extractedOffer={extractedOffer}
          analysisId={state.data?.analysisId}
        />
      ) : null}
    </div>
  );
}

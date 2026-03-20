'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { submitJobOfferAnalysis, type JobOfferActionState } from '@/app/actions/job-offers';
import { JOB_OFFER_BENEFIT_SUGGESTIONS } from '@/lib/job-offers/constants';
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
  const [state, formAction, isPending] = useActionState(submitJobOfferAnalysis, initialState);
  const analysis = state.data?.analysis;

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit uppercase tracking-[0.18em] text-[10px]">
            Standalone module
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight">Analyze a job offer</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            This first implementation analyzes structured inputs and stores the result in the dedicated job-offers module.
            URL and PDF sources are modeled now; remote extraction and PDF parsing are not implemented yet.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-8">
            <section className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source type</Label>
                <select
                  id="sourceType"
                  name="sourceType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="manual"
                >
                  <option value="manual">Manual</option>
                  <option value="paste">Pasted text</option>
                  <option value="url">URL</option>
                  <option value="document">PDF / document</option>
                </select>
                <FieldError state={state} name="sourceType" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Offer URL</Label>
                <Input id="sourceUrl" name="sourceUrl" placeholder="https://www.linkedin.com/jobs/view/..." />
                <FieldError state={state} name="sourceUrl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentName">Document name</Label>
                <Input id="documentName" name="documentName" placeholder="offer-letter.pdf" />
                <FieldError state={state} name="documentName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company</Label>
                <Input id="companyName" name="companyName" placeholder="LinkedIn, Glovo, Capgemini..." />
                <FieldError state={state} name="companyName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job title</Label>
                <Input id="jobTitle" name="jobTitle" placeholder="Product Designer" />
                <FieldError state={state} name="jobTitle" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Casablanca" />
                <FieldError state={state} name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Salary min</Label>
                <Input id="salaryMin" name="salaryMin" type="number" min="0" placeholder="18000" />
                <FieldError state={state} name="salaryMin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Salary max</Label>
                <Input id="salaryMax" name="salaryMax" type="number" min="0" placeholder="22000" />
                <FieldError state={state} name="salaryMax" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payPeriod">Pay period</Label>
                <select
                  id="payPeriod"
                  name="payPeriod"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="monthly"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <FieldError state={state} name="payPeriod" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract type</Label>
                <select
                  id="contractType"
                  name="contractType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">Not specified</option>
                  <option value="cdi">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                  <option value="temporary">Temporary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workModel">Work model</Label>
                <select
                  id="workModel"
                  name="workModel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">Not specified</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seniorityLevel">Seniority</Label>
                <select
                  id="seniorityLevel"
                  name="seniorityLevel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">Not specified</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="manager">Manager</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperienceRequired">Years of experience</Label>
                <Input id="yearsExperienceRequired" name="yearsExperienceRequired" type="number" min="0" max="60" placeholder="4" />
              </div>
            </section>

            <section className="space-y-3">
              <Label>Benefits</Label>
              <div className="flex flex-wrap gap-3">
                {JOB_OFFER_BENEFIT_SUGGESTIONS.map((benefit) => (
                  <label
                    key={benefit}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                  >
                    <input type="checkbox" name="benefits" value={benefit} className="h-4 w-4" />
                    {benefit}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="sourceText">Offer text</Label>
              <Textarea
                id="sourceText"
                name="sourceText"
                placeholder="Paste the job description, recruiter message, or offer summary here."
                className="min-h-40"
              />
              <FieldError state={state} name="sourceText" />
            </section>

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {state.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Analyzing...' : 'Analyze and save'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/job-offers/history">View my history</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {analysis ? <JobOfferAnalysisResult analysis={analysis} analysisId={state.data?.analysisId} /> : null}
    </div>
  );
}

'use client';

import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  Eye,
  ExternalLink,
  MapPin,
  MessageSquareMore,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { analytics } from '@/lib/analytics';
import type {
  JobOfferAnalysisRecord,
  JobOfferEmployerContext,
  JobOfferExtractionDiagnostics,
  JobOfferExtractionResult,
  JobOfferRecord,
  JobOfferSimilarOffer,
} from '@/lib/types';
import { hasUsableSalary, normalizeSalaryRange } from '@/lib/job-offers/salary';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type AnalysisView = Omit<JobOfferAnalysisRecord, 'id' | 'job_offer_id' | 'created_at'>;

type Props = {
  analysis: AnalysisView;
  extractedOffer?: JobOfferExtractionResult;
  extractionDiagnostics?: JobOfferExtractionDiagnostics;
  offer?: JobOfferRecord;
  analysisId?: string;
  employerContext?: JobOfferEmployerContext | null;
  similarOffers?: JobOfferSimilarOffer[];
};

type OfferSnapshot = {
  companyName: string;
  jobTitle: string;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  payPeriod: 'monthly' | 'yearly';
  contractType: string | null;
  workModel: string | null;
  seniorityLevel: string | null;
  benefits: string[];
  sourceSummary: string;
  sourceType: string | null;
  sourceUrl: string | null;
  documentName: string | null;
};

type StrategicGap = {
  title: string;
  insight: string;
  action: string;
};

type Dimension = {
  title: string;
  value: number;
  label: string;
  note: string;
  kind?: 'default' | 'risk';
};

type DynamicAction = {
  title: string;
  body: string;
  href: string;
  kind: 'primary' | 'secondary';
  ctaId: string;
};

type ReviewAwareSignal = {
  title: string;
  body: string;
  tone: string;
};

type ResultStepKey = 'offer' | 'employer' | 'compare' | 'actions' | 'details';

const RESULT_STEPS: Array<{
  key: ResultStepKey;
  label: string;
  title: string;
  body: string;
}> = [
  {
    key: 'offer',
    label: 'Offer',
    title: 'Read the offer itself',
    body: 'Verdict, facts, confidence, and what is still missing.',
  },
  {
    key: 'employer',
    label: 'Employer',
    title: 'Check employer context',
    body: 'Business signal, review context, and mapped employer data.',
  },
  {
    key: 'compare',
    label: 'Compare',
    title: 'Compare nearby alternatives',
    body: 'See how this role stacks up against similar analyzed offers.',
  },
  {
    key: 'actions',
    label: 'Next actions',
    title: 'Decide what to do next',
    body: 'Recruiter questions, dynamic CTAs, and follow-up actions.',
  },
  {
    key: 'details',
    label: 'Details',
    title: 'Inspect diagnostics',
    body: 'Source details, detected fields, and confidence diagnostics.',
  },
];

function formatWords(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(value);
}

function formatPayPeriod(value: 'monthly' | 'yearly') {
  return value === 'yearly' ? 'year' : 'month';
}

function formatContractType(value: string | null) {
  if (!value) return 'Not specified';
  if (value === 'cdi' || value === 'cdd') return value.toUpperCase();
  if (value === 'internship') return 'Internship';
  return formatWords(value);
}

function formatWorkModel(value: string | null) {
  if (!value) return 'Not specified';
  if (value === 'onsite') return 'On-site';
  return formatWords(value);
}

function formatSourceType(value: string | null) {
  if (!value) return 'Private analysis';
  if (value === 'url') return 'Link source';
  if (value === 'paste') return 'Pasted text';
  if (value === 'document') return 'Document';
  return formatWords(value);
}

function formatBenchmarkSource(value: string | null | undefined) {
  if (!value || value === 'none') return 'No usable benchmark yet';
  if (value === 'role_city') return 'Role + city benchmark';
  if (value === 'company') return 'Company benchmark';
  if (value === 'city') return 'City benchmark';
  return formatWords(value);
}

function buildSnapshot(extractedOffer?: JobOfferExtractionResult, offer?: JobOfferRecord): OfferSnapshot {
  const normalizedSalary = normalizeSalaryRange(
    extractedOffer?.salaryMin ?? offer?.salary_min ?? null,
    extractedOffer?.salaryMax ?? offer?.salary_max ?? null
  );

  return {
    companyName: extractedOffer?.companyName || offer?.company_name || 'Unknown company',
    jobTitle: extractedOffer?.jobTitle || offer?.job_title || 'Unclear role',
    city: extractedOffer?.city || offer?.city || null,
    salaryMin: normalizedSalary.salaryMin,
    salaryMax: normalizedSalary.salaryMax,
    payPeriod: extractedOffer?.payPeriod || offer?.pay_period || 'monthly',
    contractType: extractedOffer?.contractType ?? offer?.contract_type ?? null,
    workModel: extractedOffer?.workModel ?? offer?.work_model ?? null,
    seniorityLevel: extractedOffer?.seniorityLevel ?? offer?.seniority_level ?? null,
    benefits: extractedOffer?.benefits || offer?.benefits || [],
    sourceSummary: extractedOffer?.sourceSummary || offer?.source_text?.slice(0, 220) || '',
    sourceType: offer?.source_type || null,
    sourceUrl: offer?.source_url || null,
    documentName: offer?.document_name || null,
  };
}

function formatSalary(snapshot: OfferSnapshot) {
  const { salaryMin, salaryMax, payPeriod } = snapshot;
  if (salaryMin == null && salaryMax == null) return 'Not disclosed';
  if (salaryMin != null && salaryMax != null) {
    return `${formatMoney(salaryMin)} - ${formatMoney(salaryMax)} MAD / ${formatPayPeriod(payPeriod)}`;
  }
  return `${formatMoney(salaryMin ?? salaryMax ?? 0)} MAD / ${formatPayPeriod(payPeriod)}`;
}

function getConfidenceMeta(analysis: AnalysisView, snapshot: OfferSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (analysis.confidence_level === 'high') {
    return {
      score: 86,
      label: 'High confidence',
      note: 'Salary and benchmark context are both strong enough to support a firmer read.',
    };
  }

  if (analysis.confidence_level === 'medium') {
    return {
      score: 60,
      label: 'Medium confidence',
      note: 'There is some market context here, but you should still verify key details before deciding.',
    };
  }

  return {
    score: hasSalary ? 28 : 18,
    label: 'Low confidence',
    note: hasSalary
      ? 'Benchmark coverage is thin, so this should be read as guidance rather than a verdict.'
      : 'Salary is missing, so AVisine should not make a strong market claim here.',
  };
}

function getVerdictMeta(analysis: AnalysisView, snapshot: OfferSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const canAssessCompensation = hasSalary && analysis.benchmark_primary_source && analysis.benchmark_primary_source !== 'none';

  if (!canAssessCompensation || analysis.market_position_label === 'insufficient_data') {
    return {
      eyebrow: 'Clarification mode',
      title: hasSalary ? 'Useful signal, incomplete verdict' : 'Too incomplete for a pay verdict',
      summary: hasSalary
        ? 'Some parts of the offer are readable, but the evidence is not strong enough for a reliable market conclusion yet.'
        : 'This offer can still help you prepare smarter questions, but salary is missing so it should not be treated as fair, strong, or weak pay.',
      tone: 'border-amber-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_42%),linear-gradient(135deg,rgba(255,251,235,1),rgba(255,255,255,0.95))]',
      badgeTone: 'border-amber-200 bg-amber-50 text-amber-900',
    };
  }

  if (analysis.market_position_label === 'strong_offer') {
    return {
      eyebrow: 'Positive signal',
      title: 'This offer reads as unusually competitive',
      summary: 'The pay signal and structure both look stronger than a typical vague listing, but the final decision should still depend on scope, manager quality, and growth path.',
      tone: 'border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(135deg,rgba(236,253,245,1),rgba(255,255,255,0.96))]',
      badgeTone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }

  if (analysis.market_position_label === 'above_market') {
    return {
      eyebrow: 'Encouraging signal',
      title: 'This offer looks better than the local baseline',
      summary: 'The offer shows enough evidence to suggest a favorable read, but you should still verify the exact scope, reporting line, and package conditions.',
      tone: 'border-sky-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_42%),linear-gradient(135deg,rgba(239,246,255,1),rgba(255,255,255,0.96))]',
      badgeTone: 'border-sky-200 bg-sky-50 text-sky-900',
    };
  }

  if (analysis.market_position_label === 'fair_market') {
    return {
      eyebrow: 'Balanced read',
      title: 'This offer looks roughly in line with the market',
      summary: 'Nothing here looks dramatically off-market, but that does not automatically make it a good personal decision. Role scope and conditions still matter.',
      tone: 'border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_42%),linear-gradient(135deg,rgba(248,250,252,1),rgba(255,255,255,0.96))]',
      badgeTone: 'border-slate-200 bg-white text-slate-900',
    };
  }

  return {
    eyebrow: 'Caution signal',
    title: 'This offer looks weaker than the visible benchmark',
    summary: 'The available evidence suggests a less attractive read than the market baseline. Clarify the package and role scope before spending too much time in the process.',
    tone: 'border-rose-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.16),_transparent_42%),linear-gradient(135deg,rgba(255,241,242,1),rgba(255,255,255,0.96))]',
    badgeTone: 'border-rose-200 bg-rose-50 text-rose-900',
  };
}

function getPositiveSignals(analysis: AnalysisView, snapshot: OfferSnapshot) {
  const positives = [...analysis.strengths];

  if (hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    positives.push('Salary is disclosed, which saves you from guessing basic compensation terms.');
  }
  if (snapshot.contractType) {
    positives.push(`The contract type is stated as ${formatContractType(snapshot.contractType)}.`);
  }
  if (snapshot.workModel) {
    positives.push(`The work model is explicitly stated as ${formatWorkModel(snapshot.workModel)}.`);
  }
  if (snapshot.city) {
    positives.push(`The offer is tied to a specific market: ${snapshot.city}.`);
  }

  return Array.from(new Set(positives)).slice(0, 4);
}

function getConcernSignals(
  analysis: AnalysisView,
  snapshot: OfferSnapshot,
  diagnostics?: JobOfferExtractionDiagnostics
) {
  const concerns: string[] = [];

  for (const flag of analysis.risk_flags) {
    if (flag === 'missing_salary') concerns.push('Salary is missing, so the offer should not be framed as fair or strong pay.');
    if (flag === 'wide_salary_range') concerns.push('The salary range is wide, which can hide level mismatch or negotiation asymmetry.');
    if (flag === 'missing_location') concerns.push('Location is unclear, which makes commute, market fit, and cost-of-living tradeoffs harder to judge.');
    if (flag === 'missing_contract_type') concerns.push('Contract type is missing, so employment stability is still unclear.');
    if (flag === 'missing_work_model') concerns.push('Work model is not stated, which usually becomes a late-stage friction point.');
    if (flag === 'missing_seniority') concerns.push('Seniority is unclear, which can mask both workload and salary expectations.');
    if (flag === 'low_benchmark_confidence') concerns.push('Benchmark confidence is low, so this read should be used as directional guidance only.');
  }

  const companyConfidence = diagnostics?.fieldDiagnostics.companyName?.confidence;
  if (companyConfidence === 'low' || companyConfidence === 'none') {
    concerns.push('Company identification may need manual confirmation before you invest more time.');
  }

  const titleConfidence = diagnostics?.fieldDiagnostics.jobTitle?.confidence;
  if (titleConfidence === 'low' || titleConfidence === 'none') {
    concerns.push('The role title may be loosely extracted, so scope should be clarified early.');
  }

  if (!snapshot.benefits.length) {
    concerns.push('Benefits are not visible, so total package quality is still hard to judge.');
  }

  return Array.from(new Set(concerns)).slice(0, 4);
}

function getStrategicGaps(snapshot: OfferSnapshot): StrategicGap[] {
  const gaps: StrategicGap[] = [];

  if (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    gaps.push({
      title: 'Salary band missing',
      insight: 'The employer is asking for your time before disclosing the most basic compensation anchor.',
      action: 'Ask for the salary band before committing to multiple interview rounds.',
    });
  }
  if (!snapshot.contractType) {
    gaps.push({
      title: 'Contract type unclear',
      insight: 'Without contract clarity, stability and legal framing are still open questions.',
      action: 'Ask whether this is CDI, CDD, freelance, internship, or temporary hiring.',
    });
  }
  if (!snapshot.workModel) {
    gaps.push({
      title: 'Work model not stated',
      insight: 'On-site, hybrid, and remote expectations shape commute cost and day-to-day quality of life.',
      action: 'Clarify office presence, flexibility, and any travel expectations.',
    });
  }
  if (!snapshot.benefits.length) {
    gaps.push({
      title: 'Benefits package unclear',
      insight: 'An offer can look fine on base salary while still being weak on transport, insurance, or variable pay.',
      action: 'Ask for the full package, not just base salary.',
    });
  }
  if (!snapshot.seniorityLevel) {
    gaps.push({
      title: 'Leveling is vague',
      insight: 'If level is not explicit, the employer may still be flexible on expectations or budget.',
      action: 'Ask what level they have budgeted and what success looks like in the first 90 days.',
    });
  }

  return gaps.slice(0, 4);
}

function getRecruiterQuestions(snapshot: OfferSnapshot, gaps: StrategicGap[]) {
  const questions = gaps.map((gap) => gap.action.replace(/\.$/, '?'));

  if (!snapshot.city) {
    questions.push('Where is the role based, and is relocation or regular travel expected?');
  }
  if (hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    questions.push('How is the package structured between fixed pay, variable pay, bonuses, and benefits?');
  }

  questions.push('Who would this role report to, and how is the team currently structured?');
  questions.push('What would strong performance look like in the first 3 to 6 months?');

  return Array.from(new Set(questions)).slice(0, 5);
}

function getInterviewTopics(snapshot: OfferSnapshot, analysis: AnalysisView) {
  const topics = [
    'Role scope, ownership, and first-quarter expectations',
    'Team structure, reporting line, and decision-making cadence',
  ];

  if (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    topics.push('Compensation expectations and how the package is framed');
  } else {
    topics.push('Package details, variable pay, and evaluation criteria');
  }

  if (!snapshot.workModel) {
    topics.push('Work model, office rhythm, and schedule flexibility');
  } else if (snapshot.workModel === 'remote') {
    topics.push('Remote collaboration style, availability expectations, and tooling');
  } else if (snapshot.workModel === 'hybrid') {
    topics.push('Hybrid rhythm, on-site expectations, and cross-team coordination');
  } else {
    topics.push('On-site expectations, commute practicality, and manager access');
  }

  if (analysis.quality_score >= 75) {
    topics.push('Growth path, promotion logic, and stretch opportunities');
  }

  return topics.slice(0, 4);
}

function getHiddenSignals(
  analysis: AnalysisView,
  snapshot: OfferSnapshot,
  diagnostics?: JobOfferExtractionDiagnostics
) {
  const signals: string[] = [];

  if (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    signals.push('Omitting salary usually shifts leverage toward later interview stages.');
  }
  if (analysis.risk_flags.includes('wide_salary_range')) {
    signals.push('A wide salary range often means the role level is still loose or budget is not tightly set.');
  }
  if (!snapshot.contractType && !snapshot.workModel) {
    signals.push('When basic work conditions are vague, the hiring brief itself may still be under-defined.');
  }
  if (diagnostics?.fieldDiagnostics.companyName?.confidence === 'low') {
    signals.push('The company name may not be cleanly stated in the source, so verify who is really hiring.');
  }
  if (analysis.confidence_level === 'low') {
    signals.push('This read is more useful for clarification than for final judgment.');
  }

  return Array.from(new Set(signals)).slice(0, 4);
}

function getDimensionTone(kind: Dimension['kind'], value: number) {
  if (kind === 'risk') {
    if (value >= 70) return 'bg-rose-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  if (value >= 75) return 'bg-emerald-500';
  if (value >= 50) return 'bg-sky-500';
  if (value >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

function buildDimensions(snapshot: OfferSnapshot, analysis: AnalysisView): Dimension[] {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const compensationVisibility = !hasSalary
    ? 12
    : snapshot.salaryMin != null && snapshot.salaryMax != null
      ? analysis.benchmark_primary_source && analysis.benchmark_primary_source !== 'none'
        ? 84
        : 68
      : 56;
  const workConditionsVisibility = Math.min(
    100,
    (snapshot.contractType ? 35 : 0)
    + (snapshot.workModel ? 35 : 0)
    + (snapshot.benefits.length > 0 ? 20 : 0)
    + (snapshot.city ? 10 : 0)
  );
  const careerValue = Math.min(
    100,
    Math.round((analysis.quality_score * 0.72) + (snapshot.benefits.length * 6) + (snapshot.seniorityLevel ? 8 : 0))
  );
  const benchmarkConfidence = analysis.confidence_level === 'high'
    ? 86
    : analysis.confidence_level === 'medium'
      ? 60
      : 28;
  const riskLevel = Math.min(
    100,
    (analysis.risk_flags.length * 16)
    + (analysis.missing_information.length * 10)
    + (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax) ? 12 : 0)
  );

  return [
    {
      title: 'Clarity',
      value: Math.round(analysis.transparency_score),
      label: analysis.transparency_score >= 75 ? 'Clear' : analysis.transparency_score >= 50 ? 'Mixed' : 'Vague',
      note: 'How much concrete structure the offer gives you up front.',
    },
    {
      title: 'Compensation visibility',
      value: compensationVisibility,
      label: compensationVisibility >= 75 ? 'Assessable' : compensationVisibility >= 50 ? 'Partial' : 'Withheld',
      note: hasSalary
        ? 'Salary is visible, but market judgment still depends on benchmark strength.'
        : 'No salary was disclosed, so pay quality should not be assumed.',
    },
    {
      title: 'Work conditions visibility',
      value: workConditionsVisibility,
      label: workConditionsVisibility >= 75 ? 'Well defined' : workConditionsVisibility >= 45 ? 'Partly visible' : 'Unclear',
      note: 'Contract, work model, city, and benefits shape day-to-day reality.',
    },
    {
      title: 'Career value',
      value: careerValue,
      label: careerValue >= 75 ? 'Potentially strong' : careerValue >= 50 ? 'Needs validation' : 'Thin evidence',
      note: 'A proxy for role quality, package depth, and growth visibility.',
    },
    {
      title: 'Benchmark confidence',
      value: benchmarkConfidence,
      label: formatWords(analysis.confidence_level),
      note: formatBenchmarkSource(analysis.benchmark_primary_source),
    },
    {
      title: 'Risk level',
      value: riskLevel,
      label: riskLevel >= 70 ? 'High' : riskLevel >= 40 ? 'Moderate' : 'Low',
      note: 'Higher means more ambiguity, downside, or negotiation risk.',
      kind: 'risk',
    },
  ];
}

function getPrimaryNextStep(analysis: AnalysisView, snapshot: OfferSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (!hasSalary) {
    return 'Ask for the salary band before investing more time.';
  }

  if (analysis.confidence_level === 'low') {
    return 'Use this as a question-prep tool, not a final decision.';
  }

  if (analysis.market_position_label === 'below_market') {
    return 'Only continue if the role scope or growth path clearly compensates for the weaker pay signal.';
  }

  if (analysis.market_position_label === 'strong_offer' || analysis.market_position_label === 'above_market') {
    return 'Worth a deeper conversation, but verify manager quality and full package details.';
  }

  return 'Treat this as a decent baseline and pressure-test the missing conditions.';
}

function getFieldConfidenceBadge(
  diagnostics: JobOfferExtractionDiagnostics | undefined,
  field:
    | 'companyName'
    | 'jobTitle'
    | 'city'
    | 'salaryMin'
    | 'salaryMax'
    | 'payPeriod'
    | 'contractType'
    | 'workModel'
    | 'seniorityLevel'
    | 'benefits'
) {
  const confidence = diagnostics?.fieldDiagnostics[field]?.confidence;

  if (!confidence) {
    return <Badge variant="outline">Saved</Badge>;
  }

  const tone = confidence === 'high'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : confidence === 'medium'
      ? 'border-sky-200 bg-sky-50 text-sky-900'
      : confidence === 'low'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-100 text-slate-700';

  return <Badge variant="outline" className={tone}>{formatWords(confidence)}</Badge>;
}

function getFieldStatusBadge(
  diagnostics: JobOfferExtractionDiagnostics | undefined,
  field:
    | 'companyName'
    | 'jobTitle'
    | 'city'
    | 'salaryMin'
    | 'salaryMax'
    | 'payPeriod'
    | 'contractType'
    | 'workModel'
    | 'seniorityLevel'
    | 'benefits'
) {
  const confidence = diagnostics?.fieldDiagnostics[field]?.confidence;

  if (!confidence) {
    return <Badge variant="secondary">Needs verification</Badge>;
  }

  const copy = confidence === 'high'
    ? 'Confirmed'
    : confidence === 'medium'
      ? 'Likely'
      : confidence === 'low'
        ? 'Limited confidence'
        : 'Not detected';
  const tone = confidence === 'high'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : confidence === 'medium'
      ? 'border-sky-200 bg-sky-50 text-sky-900'
      : confidence === 'low'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-100 text-slate-700';

  return <Badge variant="outline" className={tone}>{copy}</Badge>;
}

function getEmployerSignalTone(context: JobOfferEmployerContext['signal_label']) {
  if (context === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (context === 'mixed') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function formatEmployerSignal(context: JobOfferEmployerContext['signal_label']) {
  if (context === 'strong') return 'Strong employer signal';
  if (context === 'mixed') return 'Mixed employer signal';
  return 'Limited employer signal';
}

function buildDynamicActions(options: {
  snapshot: OfferSnapshot;
  employerContext?: JobOfferEmployerContext | null;
  similarOffers: JobOfferSimilarOffer[];
}): DynamicAction[] {
  const actions: DynamicAction[] = [];

  if (!hasUsableSalary(options.snapshot.salaryMin, options.snapshot.salaryMax)) {
    actions.push({
      title: 'Ask for salary before continuing',
      body: 'Compensation details are missing or too unclear to justify a long process yet.',
      href: '#actions-step',
      kind: 'primary',
      ctaId: 'ask_salary_before_continuing',
    });
  }

  if (options.employerContext) {
    actions.push({
      title: 'Review this employer before applying',
      body: 'This offer is mapped confidently enough to add employer context from reviews and company data.',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: actions.length === 0 ? 'primary' : 'secondary',
      ctaId: 'view_company_reviews',
    });

    actions.push({
      title: 'Open company salary page',
      body: 'Use company salary context to judge whether this offer fits the broader employer pattern.',
      href: `/businesses/${options.employerContext.business_slug}/salaries`,
      kind: 'secondary',
      ctaId: 'open_company_salary_page',
    });
  }

  if (options.similarOffers.length > 0) {
    actions.push({
      title: 'Compare with similar offers',
      body: 'You have enough matching role and market data to compare this against nearby alternatives.',
      href: '#compare-step',
      kind: actions.length === 0 ? 'primary' : 'secondary',
      ctaId: 'compare_with_similar_offers',
    });
  }

  actions.push({
    title: 'Use recruiter questions next',
    body: 'Turn the analysis into a sharper recruiter conversation before committing more time.',
    href: '#actions-step',
    kind: actions.length === 0 ? 'primary' : 'secondary',
    ctaId: 'use_recruiter_questions',
  });

  return actions.slice(0, 4);
}

function getReviewAwareSignal(
  analysis: AnalysisView,
  snapshot: OfferSnapshot,
  employerContext?: JobOfferEmployerContext | null
): ReviewAwareSignal | null {
  if (!employerContext || employerContext.review_count < 8 || employerContext.overall_rating == null) {
    return null;
  }

  const rating = employerContext.overall_rating;
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (!hasSalary && rating < 3.5) {
    return {
      title: 'Compensation is unclear and employee sentiment is mixed',
      body: 'The offer is missing salary details, and the employer signal is not strong enough to offset that ambiguity. Use reviews before you commit more time.',
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    };
  }

  if (rating <= 2.9) {
    return {
      title: 'Offer looks fine, but employer reputation is weak',
      body: 'The visible offer may still be usable, but public employee sentiment is weak enough that employer context should heavily influence your decision.',
      tone: 'border-rose-200 bg-rose-50 text-rose-950',
    };
  }

  if (rating >= 4.1 && employerContext.review_count >= 15 && analysis.market_position_label !== 'below_market') {
    return {
      title: 'Employer reviews reinforce a positive read',
      body: 'The offer signal and the employer context point in the same direction, which makes this read more useful than a salary-only interpretation.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    };
  }

  return {
    title: 'Employer context adds nuance, not certainty',
    body: 'Public reviews add useful context here, but they should be read as a secondary layer rather than a replacement for offer-specific evidence.',
    tone: 'border-slate-200 bg-slate-50 text-slate-900',
  };
}

function TrackedActionButton({
  href,
  ctaId,
  placement,
  context,
  businessId,
  variant = 'default',
  size = 'default',
  className,
  children,
}: {
  href: string;
  ctaId: string;
  placement: string;
  context: string;
  businessId?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button variant={variant} size={size} asChild className={className}>
      <Link
        href={href}
        onClick={() => {
          analytics.trackCtaClick(ctaId, placement, context, undefined, undefined, businessId);
        }}
      >
        {children}
      </Link>
    </Button>
  );
}

function QuickStat({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: string;
}) {
  return (
    <div className={cn('rounded-[1.6rem] border p-4', tone)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

export function JobOfferAnalysisResult({
  analysis,
  extractedOffer,
  extractionDiagnostics,
  offer,
  analysisId,
  employerContext,
  similarOffers = [],
}: Props) {
  const [activeStep, setActiveStep] = useState<ResultStepKey>('offer');
  const snapshot = buildSnapshot(extractedOffer, offer);
  const confidence = getConfidenceMeta(analysis, snapshot);
  const verdict = getVerdictMeta(analysis, snapshot);
  const positives = getPositiveSignals(analysis, snapshot);
  const concerns = getConcernSignals(analysis, snapshot, extractionDiagnostics);
  const strategicGaps = getStrategicGaps(snapshot);
  const recruiterQuestions = getRecruiterQuestions(snapshot, strategicGaps);
  const interviewTopics = getInterviewTopics(snapshot, analysis);
  const hiddenSignals = getHiddenSignals(analysis, snapshot, extractionDiagnostics);
  const dimensions = buildDimensions(snapshot, analysis);
  const nextStep = getPrimaryNextStep(analysis, snapshot);
  const dynamicActions = buildDynamicActions({ snapshot, employerContext, similarOffers });
  const primaryAction = dynamicActions[0];
  const reviewAwareSignal = getReviewAwareSignal(analysis, snapshot, employerContext);
  const activeStepIndex = RESULT_STEPS.findIndex((step) => step.key === activeStep);

  useEffect(() => {
    setActiveStep('offer');
  }, [analysisId, snapshot.companyName, snapshot.jobTitle]);

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.8rem] border-slate-200 bg-slate-950 text-white shadow-sm" id="offer-step">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">AI-powered job offer analysis</Badge>
              <Badge variant="outline" className="border-white/20 bg-transparent text-white/80">
                Private decision workspace
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
              AI extracted the offer, checked market signals, and assembled next actions.
            </h2>
            <p className="mt-2 text-sm leading-7 text-white/75 md:text-base">
              Use this as decision support, not ground truth. Confidence depends on source quality, employer mapping, and available benchmarks.
            </p>
          </div>
          <div className="grid gap-2 rounded-[1.3rem] border border-white/15 bg-white/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-white/85">
              <Bot className="h-4 w-4" />
              AI extraction
            </div>
            <div className="flex items-center gap-2 text-white/85">
              <Star className="h-4 w-4" />
              Employer context
            </div>
            <div className="flex items-center gap-2 text-white/85">
              <Users className="h-4 w-4" />
              Similar offers
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Offer identity</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{snapshot.jobTitle}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{snapshot.companyName}</span>
              <span className="text-slate-300">•</span>
              <span>{snapshot.city || 'Location unclear'}</span>
              <span className="text-slate-300">•</span>
              <span>{formatSourceType(snapshot.sourceType)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysisId ? (
              <TrackedActionButton
                href={`/job-offers/${analysisId}`}
                ctaId="open_saved_analysis_header"
                placement="job_offer_header"
                context="job_offer_result"
                businessId={employerContext?.business_id || undefined}
                size="sm"
              >
                <>Open saved analysis</>
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
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step-by-step workspace</p>
            <p className="mt-2 text-sm text-slate-600">
              Move through the offer in order: understand the offer, check the employer, compare alternatives, then decide the next action.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {RESULT_STEPS.map((step, index) => {
              const isActive = step.key === activeStep;
              const isComplete = index < activeStepIndex;

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  className={cn(
                    'rounded-[1.4rem] border px-4 py-4 text-left transition-colors',
                    isActive
                      ? 'border-slate-900 bg-slate-950 text-white shadow-sm'
                      : isComplete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-slate-50/70 text-slate-900'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isActive ? 'text-white/75' : 'text-slate-500')}>
                      Step {index + 1}
                    </p>
                    {isComplete ? <BadgeCheck className="h-4 w-4" /> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{step.label}</p>
                  <p className={cn('mt-1 text-sm leading-6', isActive ? 'text-white/80' : 'text-slate-600')}>{step.body}</p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{RESULT_STEPS[activeStepIndex]?.title}</p>
              <p className="mt-1 text-sm text-slate-600">{RESULT_STEPS[activeStepIndex]?.body}</p>
            </div>
            <Badge variant="outline">AI-powered</Badge>
          </div>
        </CardContent>
      </Card>

      {activeStep === 'offer' ? (
        <>
          <Card className={cn('overflow-hidden rounded-[2rem] border shadow-sm', verdict.tone)} id="offer-step">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={verdict.badgeTone}>
                      Decision cockpit
                    </Badge>
                    <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                      {formatSourceType(snapshot.sourceType)}
                    </Badge>
                    <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                      {formatBenchmarkSource(analysis.benchmark_primary_source)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {verdict.eyebrow}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                      {verdict.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                      {verdict.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                      {hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax) ? 'Salary disclosed' : 'Salary missing'}
                    </Badge>
                    <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                      {snapshot.workModel ? formatWorkModel(snapshot.workModel) : 'Work model unclear'}
                    </Badge>
                    <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">
                      {snapshot.contractType ? formatContractType(snapshot.contractType) : 'Contract unclear'}
                    </Badge>
                  </div>
                </div>

                <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Assessment confidence
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {confidence.label}
                      </p>
                    </div>
                    <ShieldAlert className="h-5 w-5 text-slate-500" />
                  </div>
                  <Progress value={confidence.score} className="mt-4 h-2.5 border-slate-200 bg-white" />
                  <p className="mt-3 text-sm leading-6 text-slate-600">{confidence.note}</p>

                  <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Visible salary</span>
                      <span className="font-semibold text-slate-900">{formatSalary(snapshot)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Location</span>
                      <span className="font-semibold text-slate-900">{snapshot.city || 'Unclear'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Market read</span>
                      <span className="font-semibold text-slate-900">
                        {analysis.market_position_label === 'insufficient_data'
                          ? 'Withheld'
                          : formatWords(analysis.market_position_label)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QuickStat
                  title="Best signal"
                  body={positives[0] || 'The offer includes at least a few structured details instead of being completely opaque.'}
                  tone="border-emerald-200 bg-emerald-50/80 text-emerald-950"
                />
                <QuickStat
                  title="Main concern"
                  body={concerns[0] || 'There is no major red flag here, but several decision-critical details still need confirmation.'}
                  tone="border-rose-200 bg-rose-50/80 text-rose-950"
                />
                <QuickStat
                  title="What is missing"
                  body={strategicGaps[0]?.title ? `${strategicGaps[0].title}. ${strategicGaps[0].insight}` : 'Most core fields are visible, but package and reporting details should still be verified.'}
                  tone="border-amber-200 bg-amber-50/80 text-amber-950"
                />
                <QuickStat
                  title="Best next step"
                  body={nextStep}
                  tone="border-sky-200 bg-sky-50/80 text-sky-950"
                />
              </div>

              {primaryAction ? (
                <div className="mt-6 rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended next step</p>
                  <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-lg font-black tracking-tight text-slate-950">{primaryAction.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{primaryAction.body}</p>
                    </div>
                    <TrackedActionButton
                      href={primaryAction.href}
                      ctaId={primaryAction.ctaId}
                      placement="job_offer_primary_action"
                      context="job_offer_result"
                      businessId={employerContext?.business_id || undefined}
                    >
                      <>
                        Open next step
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    </TrackedActionButton>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-black tracking-tight">What looks positive vs what needs clarification</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    Strongest positives
                  </div>
                  {(positives.length > 0 ? positives : ['This offer is not empty; there is enough material here to prepare a sharper recruiter conversation.']).map((item) => (
                    <div key={item} className="rounded-[1.3rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-900">Fact</Badge>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Strongest concerns
                  </div>
                  {(concerns.length > 0 ? concerns : ['No major structural risk is obvious, but you still need to verify role scope and manager fit.']).map((item) => (
                    <div key={item} className="rounded-[1.3rem] border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="border-rose-200 bg-white text-rose-900">Interpretation</Badge>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-black tracking-tight">What the employer did not specify</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(strategicGaps.length > 0 ? strategicGaps : [{
                    title: 'Most basics are visible',
                    insight: 'This offer is more complete than average, but the full package and reporting line still deserve confirmation.',
                    action: 'Use the recruiter questions below to pressure-test the details that matter most to you.',
                  }]).map((gap) => (
                    <div key={gap.title} className="rounded-[1.3rem] border border-amber-100 bg-amber-50 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <CircleHelp className="h-4 w-4 text-amber-700" />
                        <p className="font-semibold text-amber-950">{gap.title}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-amber-950">{gap.insight}</p>
                      <p className="mt-3 text-sm font-medium text-amber-900">{gap.action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-black tracking-tight">Hidden signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
                  {(hiddenSignals.length > 0 ? hiddenSignals : ['Nothing subtle stands out yet; this mainly reads like a standard structured job listing.']).map((signal) => (
                    <div key={signal} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">Interpretation</Badge>
                      </div>
                      {signal}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight">Decision dimensions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dimensions.map((dimension) => (
                <div key={dimension.title} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{dimension.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{dimension.label}</p>
                    </div>
                    <p className="text-2xl font-black tracking-tight text-slate-950">{dimension.value}</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-200">
                    <div
                      className={cn('h-full rounded-full', getDimensionTone(dimension.kind, dimension.value))}
                      style={{ width: `${dimension.value}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{dimension.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeStep === 'employer' ? (
        <>
          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="employer-step">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight">Employer context</CardTitle>
            </CardHeader>
            <CardContent>
              {employerContext ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getEmployerSignalTone(employerContext.signal_label)}>
                      {formatEmployerSignal(employerContext.signal_label)}
                    </Badge>
                    <Badge variant="outline">{employerContext.is_claimed ? 'Claimed' : 'Unclaimed'}</Badge>
                    {employerContext.verification_badge_level && employerContext.verification_badge_level !== 'none' ? (
                      <Badge variant="outline">Verified</Badge>
                    ) : null}
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-slate-700">{employerContext.signal_summary}</p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: 'Rating', value: employerContext.overall_rating != null ? employerContext.overall_rating.toFixed(1) : 'N/A' },
                      { label: 'Reviews', value: String(employerContext.review_count) },
                      { label: 'Claimed', value: employerContext.is_claimed ? 'Yes' : 'No' },
                      { label: 'Company size', value: employerContext.company_size || 'Unknown' },
                      { label: 'Salary reputation', value: employerContext.salary_median_monthly != null ? `${formatMoney(employerContext.salary_median_monthly)} MAD` : 'Limited data' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <TrackedActionButton
                      href={`/businesses/${employerContext.business_slug}/reviews`}
                      ctaId="employer_context_reviews"
                      placement="employer_context"
                      context="job_offer_result"
                      businessId={employerContext.business_id}
                      variant="outline"
                    >
                      <>
                        View company reviews
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    </TrackedActionButton>
                    <TrackedActionButton
                      href={`/businesses/${employerContext.business_slug}`}
                      ctaId="employer_context_company_page"
                      placement="employer_context"
                      context="job_offer_result"
                      businessId={employerContext.business_id}
                      variant="outline"
                    >
                      <>
                        Open company page
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    </TrackedActionButton>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  Employer context is unavailable because company matching is not strong enough yet. Use the offer verdict, missing-info checks, and recruiter questions instead of assuming employer certainty.
                </div>
              )}
            </CardContent>
          </Card>

          {reviewAwareSignal ? (
            <Card className={cn('rounded-[1.8rem] border shadow-sm', reviewAwareSignal.tone)}>
              <CardContent className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Review-aware interpretation</p>
                <h3 className="mt-2 text-xl font-black tracking-tight">{reviewAwareSignal.title}</h3>
                <p className="mt-2 text-sm leading-7">{reviewAwareSignal.body}</p>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeStep === 'compare' ? (
        <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="compare-step">
          <CardHeader>
            <CardTitle className="text-xl font-black tracking-tight">How this compares to similar offers</CardTitle>
          </CardHeader>
          <CardContent>
            {similarOffers.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {similarOffers.map((item) => (
                  <div key={item.analysis_id} className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{item.similarity_label}</Badge>
                      <span className="text-sm font-bold text-slate-900">{Math.round(item.overall_offer_score)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{item.company_name}</p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">{item.job_title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.city || 'Unknown city'}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>{item.salary_min == null && item.salary_max == null ? 'Salary not shown' : formatSalary({
                        ...snapshot,
                        salaryMin: item.salary_min ?? null,
                        salaryMax: item.salary_max ?? null,
                        payPeriod: item.pay_period,
                      })}</p>
                      <p>{formatWords(item.market_position_label)}</p>
                    </div>
                    <TrackedActionButton
                      href={`/job-offers/${item.analysis_id}`}
                      ctaId="open_similar_offer"
                      placement="similar_offers"
                      context="job_offer_result"
                      businessId={item.business_id || undefined}
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                    >
                      <>Open comparable analysis</>
                    </TrackedActionButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                No strong comparable offers are visible yet for this role and market combination. When more approved analyses accumulate, this section becomes comparison evidence rather than guesswork.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 'actions' ? (
        <div className="grid gap-4 xl:grid-cols-3" id="actions-step">
          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight">Questions to ask the recruiter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recruiterQuestions.map((question) => (
                <div key={question} className="rounded-[1.2rem] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="border-sky-200 bg-white text-sky-900">Action</Badge>
                  </div>
                  {question}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight">Likely interview topics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {snapshot.workModel
                  ? `Work environment clue: ${formatWorkModel(snapshot.workModel)} is already explicit, so expect questions about how you operate in that setup.`
                  : 'Work environment clue: because the work model is still vague, expect you to be the one asking for clarity on schedule and office expectations.'}
              </div>
              {interviewTopics.map((topic) => (
                <div key={topic} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700">
                  <BriefcaseBusiness className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                  <span>{topic}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black tracking-tight">Dynamic next actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dynamicActions.map((action) => (
                <div key={action.title} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <MessageSquareMore className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{action.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{action.body}</p>
                      <TrackedActionButton
                        href={action.href}
                        ctaId={action.ctaId}
                        placement="dynamic_actions"
                        context="job_offer_result"
                        businessId={employerContext?.business_id || undefined}
                        variant={action.kind === 'primary' ? 'default' : 'outline'}
                        size="sm"
                        className="mt-3"
                      >
                        <>
                          Open
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      </TrackedActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeStep === 'details' ? (
        <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="details-step">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Detected offer details</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                These details help the analysis, but they should stay secondary to the decision summary. Treat them as working assumptions, not ground truth.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                Facts first
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                Diagnostics second
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="details">
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="rounded-[1.2rem] border border-slate-200 px-4 text-left text-sm hover:no-underline">
                  Expand detected fields and source details
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: 'Company', value: snapshot.companyName, field: 'companyName' as const, icon: Building2 },
                      { label: 'Role title', value: snapshot.jobTitle, field: 'jobTitle' as const, icon: BriefcaseBusiness },
                      { label: 'City', value: snapshot.city || 'Not detected', field: 'city' as const, icon: MapPin },
                      { label: 'Salary', value: formatSalary(snapshot), field: 'salaryMin' as const, icon: Wallet },
                      { label: 'Contract', value: formatContractType(snapshot.contractType), field: 'contractType' as const, icon: BadgeCheck },
                      { label: 'Work model', value: formatWorkModel(snapshot.workModel), field: 'workModel' as const, icon: Eye },
                      { label: 'Seniority', value: snapshot.seniorityLevel ? formatWords(snapshot.seniorityLevel) : 'Not specified', field: 'seniorityLevel' as const, icon: Sparkles },
                      { label: 'Benefits', value: snapshot.benefits.length > 0 ? snapshot.benefits.join(', ') : 'None visible', field: 'benefits' as const, icon: ShieldAlert },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Icon className="h-4 w-4 text-slate-500" />
                              {item.label}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              {getFieldStatusBadge(extractionDiagnostics, item.field)}
                              {getFieldConfidenceBadge(extractionDiagnostics, item.field)}
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {snapshot.sourceSummary ? (
                    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Source summary
                      </p>
                      <p className="mt-2">{snapshot.sourceSummary}</p>
                    </div>
                  ) : null}

                  {(snapshot.sourceUrl || snapshot.documentName) ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source URL</p>
                        <p className="mt-2 break-all text-slate-700">{snapshot.sourceUrl || 'Not provided'}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Document</p>
                        <p className="mt-2 text-slate-700">{snapshot.documentName || 'Not provided'}</p>
                      </div>
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step navigation</p>
          <p className="mt-2 text-sm text-slate-600">
            Continue through the AI workspace step by step, or jump back to any previous section.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveStep(RESULT_STEPS[Math.max(activeStepIndex - 1, 0)].key)}
            disabled={activeStepIndex === 0}
          >
            Previous step
          </Button>
          <Button
            type="button"
            onClick={() => setActiveStep(RESULT_STEPS[Math.min(activeStepIndex + 1, RESULT_STEPS.length - 1)].key)}
            disabled={activeStepIndex === RESULT_STEPS.length - 1}
          >
            Next step
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {analysisId ? (
          <TrackedActionButton
            href={`/job-offers/${analysisId}`}
            ctaId="open_saved_analysis"
            placement="job_offer_footer"
            context="job_offer_result"
            businessId={employerContext?.business_id || undefined}
          >
            <>
              Open saved analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          </TrackedActionButton>
        ) : null}
        <TrackedActionButton href="/job-offers/history" ctaId="view_history" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>View my history</>
        </TrackedActionButton>
        <TrackedActionButton href="/job-offers/analyze" ctaId="analyze_another" placement="job_offer_footer" context="job_offer_result" variant="outline">
          <>Analyze another version</>
        </TrackedActionButton>
      </div>
    </div>
  );
}

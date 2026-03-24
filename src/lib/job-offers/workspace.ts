import type {
  JobOfferAnalysisRecord,
  JobOfferContractType,
  JobOfferDecisionWorkspace,
  JobOfferDecisionWorkspaceStep,
  JobOfferDynamicAction,
  JobOfferEmployerContext,
  JobOfferExtractionConfidence,
  JobOfferExtractionDiagnostics,
  JobOfferExtractionResult,
  JobOfferPayPeriod,
  JobOfferRecord,
  JobOfferReviewAwareSignal,
  JobOfferSimilarOffer,
  JobOfferWorkspaceSnapshot,
  JobOfferWorkModel,
} from '@/lib/types';
import { hasUsableSalary, normalizeSalaryRange } from '@/lib/job-offers/salary';
import { slugify } from '@/lib/utils';

type AnalysisView = Omit<JobOfferAnalysisRecord, 'id' | 'job_offer_id' | 'created_at'>;
type Dimension = JobOfferDecisionWorkspace['dimensions'][number];
type StrategicGap = JobOfferDecisionWorkspace['missingInformation'][number];

export const RESULT_STEPS: JobOfferDecisionWorkspaceStep[] = [
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

export function formatWords(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(value);
}

export function formatPayPeriod(value: JobOfferPayPeriod) {
  return value === 'yearly' ? 'year' : 'month';
}

export function formatContractType(value: JobOfferContractType | string | null | undefined) {
  if (!value) return 'Not specified';
  if (value === 'cdi' || value === 'cdd') return value.toUpperCase();
  if (value === 'internship') return 'Internship';
  return formatWords(value);
}

export function formatWorkModel(value: JobOfferWorkModel | string | null | undefined) {
  if (!value) return 'Not specified';
  if (value === 'onsite') return 'On-site';
  return formatWords(value);
}

export function formatSourceType(value: string | null | undefined) {
  if (!value) return 'Private analysis';
  if (value === 'url') return 'Link source';
  if (value === 'paste') return 'Pasted text';
  if (value === 'document') return 'Document';
  return formatWords(value);
}

export function formatBenchmarkSource(value: string | null | undefined) {
  if (!value || value === 'none') return 'No usable benchmark yet';
  if (value === 'role_city') return 'Role + city benchmark';
  if (value === 'company') return 'Company benchmark';
  if (value === 'city') return 'City benchmark';
  return formatWords(value);
}

export function formatEmployerSignal(signal: JobOfferEmployerContext['signal_label']) {
  if (signal === 'strong') return 'Strong employer signal';
  if (signal === 'mixed') return 'Mixed employer signal';
  return 'Limited employer signal';
}

export function buildEmployerSignalContext(options: {
  overallRating: number | null;
  reviewCount: number;
  verificationBadgeLevel?: string | null;
  salarySubmissionCount: number;
}): Pick<JobOfferEmployerContext, 'signal_label' | 'signal_summary'> {
  const { overallRating, reviewCount, verificationBadgeLevel, salarySubmissionCount } = options;
  const isVerified = Boolean(verificationBadgeLevel && verificationBadgeLevel !== 'none');

  if (reviewCount >= 25 && overallRating != null && overallRating >= 4 && (isVerified || salarySubmissionCount >= 5)) {
    return {
      signal_label: 'strong',
      signal_summary: 'This employer has a relatively strong public signal based on reviews, verification, and salary context.',
    };
  }

  if (reviewCount >= 8 || salarySubmissionCount >= 3 || isVerified) {
    return {
      signal_label: 'mixed',
      signal_summary: 'This employer has some usable public context, but the signal is not strong enough to treat as definitive.',
    };
  }

  return {
    signal_label: 'limited',
    signal_summary: 'Public employer context is still thin, so this should be treated as additional context rather than evidence.',
  };
}

export function buildSimilarOfferLabel(options: {
  overallOfferScore: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
}): string {
  if (options.salaryMin == null && options.salaryMax == null) {
    return 'Limited salary visibility';
  }
  if (options.overallOfferScore >= 80) {
    return 'Stronger market signal';
  }
  if (options.overallOfferScore >= 65) {
    return 'Clearer than average';
  }
  return 'Comparable nearby option';
}

export function calculateSimilarOfferSimilarityScore(options: {
  citySlug?: string | null;
  targetCitySlug?: string | null;
  seniorityLevel?: string | null;
  targetSeniorityLevel?: string | null;
  workModel?: string | null;
  targetWorkModel?: string | null;
  contractType?: string | null;
  targetContractType?: string | null;
}) {
  let score = 0;
  if (options.citySlug && options.targetCitySlug && options.citySlug === options.targetCitySlug) score += 30;
  if (options.seniorityLevel && options.targetSeniorityLevel && options.seniorityLevel === options.targetSeniorityLevel) score += 25;
  if (options.workModel && options.targetWorkModel && options.workModel === options.targetWorkModel) score += 15;
  if (options.contractType && options.targetContractType && options.contractType === options.targetContractType) score += 10;
  return score;
}

export function buildRoleCitySalaryHref(jobTitle: string | null | undefined, citySlug: string | null | undefined) {
  const roleSlug = jobTitle ? slugify(jobTitle) : '';
  if (!roleSlug || !citySlug) return null;
  return `/salaires/${roleSlug}/${citySlug}`;
}

export function buildOfferSnapshot(extractedOffer?: JobOfferExtractionResult, offer?: JobOfferRecord): JobOfferWorkspaceSnapshot {
  const normalizedSalary = normalizeSalaryRange(
    extractedOffer?.salaryMin ?? offer?.salary_min ?? null,
    extractedOffer?.salaryMax ?? offer?.salary_max ?? null
  );

  const jobTitle = extractedOffer?.jobTitle || offer?.job_title || 'Unclear role';
  const city = extractedOffer?.city || offer?.city || null;
  const citySlug = offer?.city_slug || (city ? slugify(city) : null);

  return {
    companyName: extractedOffer?.companyName || offer?.company_name || 'Unknown company',
    jobTitle,
    roleSlug: offer?.job_title_normalized || slugify(jobTitle),
    city,
    citySlug,
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

export function formatSalary(snapshot: Pick<JobOfferWorkspaceSnapshot, 'salaryMin' | 'salaryMax' | 'payPeriod'>) {
  const { salaryMin, salaryMax, payPeriod } = snapshot;
  if (salaryMin == null && salaryMax == null) return 'Not disclosed';
  if (salaryMin != null && salaryMax != null) {
    return `${formatMoney(salaryMin)} - ${formatMoney(salaryMax)} MAD / ${formatPayPeriod(payPeriod)}`;
  }
  return `${formatMoney(salaryMin ?? salaryMax ?? 0)} MAD / ${formatPayPeriod(payPeriod)}`;
}

export function getFieldConfidenceLabel(confidence?: JobOfferExtractionConfidence) {
  if (!confidence) return 'saved';
  return confidence;
}

export function getFieldStatusLabel(confidence?: JobOfferExtractionConfidence) {
  if (!confidence) return 'Needs verification';
  if (confidence === 'high') return 'Confirmed';
  if (confidence === 'medium') return 'Likely';
  if (confidence === 'low') return 'Limited confidence';
  return 'Not detected';
}

function createUnavailableEmployerContext(snapshot: JobOfferWorkspaceSnapshot, mappingConfidence: JobOfferEmployerContext['mapping_confidence']): JobOfferEmployerContext {
  return {
    business_id: null,
    business_name: snapshot.companyName,
    business_slug: null,
    overall_rating: null,
    review_count: 0,
    is_claimed: false,
    verification_badge_level: null,
    company_size: null,
    salary_median_monthly: null,
    salary_submission_count: 0,
    mapping_confidence: mappingConfidence,
    availability: 'unavailable',
    signal_label: 'limited',
    signal_summary: 'Employer context is unavailable because company matching is not reliable enough to support public interpretation.',
  };
}

export function getSalaryPresentation(
  snapshot: JobOfferWorkspaceSnapshot,
  diagnostics: JobOfferExtractionDiagnostics | undefined
) {
  const minConfidence = diagnostics?.fieldDiagnostics.salaryMin?.confidence;
  const maxConfidence = diagnostics?.fieldDiagnostics.salaryMax?.confidence;
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const highConfidence = minConfidence === 'high' || maxConfidence === 'high';

  if (!hasSalary) {
    return {
      label: 'Salary missing',
      value: 'Not disclosed',
      note: 'Compensation was not visible in the source.',
      tone: 'warning' as const,
    };
  }

  if (!highConfidence && diagnostics) {
    return {
      label: 'Salary mentioned',
      value: formatSalary(snapshot),
      note: 'Needs verification before you treat this range as firm.',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'Salary visible',
    value: formatSalary(snapshot),
    note: 'Visible enough to use in the current market read.',
    tone: 'positive' as const,
  };
}

function getConfidenceMeta(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
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
      note: 'There is some market context here, but key details should still be verified before deciding.',
    };
  }

  return {
    score: hasSalary ? 28 : 18,
    label: 'Low confidence',
    note: hasSalary
      ? 'Benchmark coverage is thin, so this should be read as guidance rather than a verdict.'
      : 'Salary is missing, so the analysis should not make a strong market claim here.',
  };
}

function getVerdictMeta(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const canAssessCompensation = hasSalary && analysis.benchmark_primary_source && analysis.benchmark_primary_source !== 'none';

  if (!canAssessCompensation || analysis.market_position_label === 'insufficient_data') {
    return {
      eyebrow: 'Clarification mode',
      title: hasSalary ? 'Useful signal, incomplete verdict' : 'Too incomplete for a pay verdict',
      summary: hasSalary
        ? 'Some parts of the offer are readable, but the evidence is not strong enough for a reliable market conclusion yet.'
        : 'This offer can still help you prepare smarter questions, but salary is missing so it should not be treated as fair, strong, or weak pay.',
      tone: 'warning' as const,
    };
  }

  if (analysis.market_position_label === 'strong_offer') {
    return {
      eyebrow: 'Positive signal',
      title: 'This offer reads as unusually competitive',
      summary: 'The pay signal and structure both look stronger than a typical vague listing, but the final decision should still depend on scope, manager quality, and growth path.',
      tone: 'positive' as const,
    };
  }

  if (analysis.market_position_label === 'above_market') {
    return {
      eyebrow: 'Encouraging signal',
      title: 'This offer looks better than the local baseline',
      summary: 'The offer shows enough evidence to suggest a favorable read, but you should still verify the exact scope, reporting line, and package conditions.',
      tone: 'neutral' as const,
    };
  }

  if (analysis.market_position_label === 'fair_market') {
    return {
      eyebrow: 'Balanced read',
      title: 'This offer looks roughly in line with the market',
      summary: 'Nothing here looks dramatically off-market, but that does not automatically make it a good personal decision. Role scope and conditions still matter.',
      tone: 'neutral' as const,
    };
  }

  return {
    eyebrow: 'Caution signal',
    title: 'This offer looks weaker than the visible benchmark',
    summary: 'The available evidence suggests a less attractive read than the market baseline. Clarify the package and role scope before spending too much time in the process.',
    tone: 'caution' as const,
  };
}

function getPositiveSignals(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
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
  snapshot: JobOfferWorkspaceSnapshot,
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

function getStrategicGaps(snapshot: JobOfferWorkspaceSnapshot): StrategicGap[] {
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

function getRecruiterQuestions(snapshot: JobOfferWorkspaceSnapshot, gaps: StrategicGap[]) {
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

function getInterviewTopics(snapshot: JobOfferWorkspaceSnapshot, analysis: AnalysisView) {
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
  snapshot: JobOfferWorkspaceSnapshot,
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

function buildDimensions(snapshot: JobOfferWorkspaceSnapshot, analysis: AnalysisView): Dimension[] {
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

function getPrimaryNextStep(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
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

function buildDynamicActions(options: {
  snapshot: JobOfferWorkspaceSnapshot;
  employerContext: JobOfferEmployerContext;
  similarOffers: JobOfferSimilarOffer[];
}) {
  const actions: JobOfferDynamicAction[] = [];
  const seen = new Set<string>();
  const salaryHref = buildRoleCitySalaryHref(options.snapshot.jobTitle, options.snapshot.citySlug);
  const employerFull = options.employerContext.availability === 'full' && !!options.employerContext.business_slug;
  const employerMixedOrWeak = employerFull
    && options.employerContext.review_count >= 8
    && options.employerContext.signal_label !== 'strong';
  const hasStrongComparableCoverage = options.similarOffers.length >= 3;

  const addAction = (action: JobOfferDynamicAction) => {
    if (seen.has(action.id)) return;
    seen.add(action.id);
    actions.push(action);
  };

  if (!hasUsableSalary(options.snapshot.salaryMin, options.snapshot.salaryMax)) {
    addAction({
      id: 'ask_salary_before_continuing',
      title: 'Ask for salary before continuing',
      body: 'Compensation details are missing or too unclear to justify a long process yet.',
      href: '#actions-step',
      kind: 'primary',
      placement: 'hero',
      cta_id: 'ask_salary_before_continuing',
    });
  } else if (employerMixedOrWeak) {
    addAction({
      id: 'review_employer_before_applying',
      title: 'Review employer before applying',
      body: 'The employer is mapped confidently, but public sentiment is mixed enough that you should review context before going deeper.',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'review_employer_before_applying',
    });
  } else if (hasStrongComparableCoverage) {
    addAction({
      id: 'compare_with_similar_offers',
      title: 'Compare with similar offers',
      body: 'You have enough matching role and market data to compare this against nearby alternatives.',
      href: '#compare-step',
      kind: 'primary',
      placement: 'hero',
      cta_id: 'compare_with_similar_offers',
    });
  } else if (salaryHref) {
    addAction({
      id: 'check_salary_benchmarks',
      title: 'Check salary benchmarks',
      body: 'Use the role and city benchmark page to pressure-test this offer against the broader market.',
      href: salaryHref,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'check_salary_benchmarks',
    });
  } else if (employerFull) {
    addAction({
      id: 'view_company_reviews',
      title: 'View company reviews',
      body: 'This offer is mapped confidently enough to add employer context from reviews and company data.',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'view_company_reviews',
    });
  }

  if (employerFull) {
    addAction({
      id: 'view_company_reviews',
      title: 'View company reviews',
      body: 'Use employee reviews to add context to the offer without distorting the salary verdict.',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: actions.length === 0 ? 'primary' : 'secondary',
      placement: 'rail',
      cta_id: 'view_company_reviews',
    });
    addAction({
      id: 'open_company_page',
      title: 'Open company page',
      body: 'See the public company profile, business details, and broader hiring context.',
      href: `/businesses/${options.employerContext.business_slug}`,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'open_company_page',
    });
    addAction({
      id: 'open_company_salary_page',
      title: 'Check company salary context',
      body: 'Use company salary context to judge whether this offer fits the broader employer pattern.',
      href: `/businesses/${options.employerContext.business_slug}/salaries`,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'open_company_salary_page',
    });
  }

  if (hasStrongComparableCoverage) {
    addAction({
      id: 'compare_with_similar_offers',
      title: 'Compare with similar offers',
      body: 'Use nearby comparable offers as evidence before you decide whether this is worth pursuing.',
      href: '#compare-step',
      kind: actions.length === 0 ? 'primary' : 'secondary',
      placement: 'rail',
      cta_id: 'compare_with_similar_offers',
    });
  }

  if (salaryHref) {
    addAction({
      id: 'check_salary_benchmarks',
      title: 'Check salary benchmarks',
      body: 'Open the role and city salary benchmark page to add market context.',
      href: salaryHref,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'check_salary_benchmarks',
    });
  }

  addAction({
    id: 'use_recruiter_questions',
    title: 'Use recruiter questions next',
    body: 'Turn the analysis into a sharper recruiter conversation before committing more time.',
    href: '#actions-step',
    kind: actions.length === 0 ? 'primary' : 'secondary',
    placement: 'rail',
    cta_id: 'use_recruiter_questions',
  });

  return actions.slice(0, 5);
}

function getReviewAwareSignal(
  analysis: AnalysisView,
  snapshot: JobOfferWorkspaceSnapshot,
  employerContext: JobOfferEmployerContext
): JobOfferReviewAwareSignal | null {
  if (employerContext.availability !== 'full' || employerContext.review_count < 8 || employerContext.overall_rating == null) {
    return null;
  }

  const rating = employerContext.overall_rating;
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (!hasSalary && rating < 3.5) {
    return {
      title: 'Compensation is unclear and employee sentiment is mixed',
      body: 'The offer is missing salary details, and the employer signal is not strong enough to offset that ambiguity. Use reviews before you commit more time.',
      tone: 'caution',
    };
  }

  if (analysis.overall_offer_score >= 55 && rating < 3.3) {
    return {
      title: 'Offer looks fine, but employer reputation is weak',
      body: 'The visible offer may still be usable, but public employee sentiment is weak enough that employer context should heavily influence your decision.',
      tone: 'warning',
    };
  }

  if (analysis.overall_offer_score >= 70 && rating >= 4.0) {
    return {
      title: 'Employer reviews reinforce a positive read',
      body: 'The offer signal and the employer context point in the same direction, which makes this read more useful than a salary-only interpretation.',
      tone: 'positive',
    };
  }

  return null;
}

export function createJobOfferDecisionWorkspace(input: {
  analysis: AnalysisView;
  offer?: JobOfferRecord;
  extractedOffer?: JobOfferExtractionResult;
  extractionDiagnostics?: JobOfferExtractionDiagnostics;
  employerContext?: JobOfferEmployerContext | null;
  similarOffers?: JobOfferSimilarOffer[];
}): JobOfferDecisionWorkspace {
  const snapshot = buildOfferSnapshot(input.extractedOffer, input.offer);
  const mappingConfidence = input.offer?.company_match_confidence || input.employerContext?.mapping_confidence || 'none';
  const employerContext = input.employerContext || createUnavailableEmployerContext(snapshot, mappingConfidence);
  const missingInformation = getStrategicGaps(snapshot);
  const recruiterQuestions = getRecruiterQuestions(snapshot, missingInformation);
  const interviewTopics = getInterviewTopics(snapshot, input.analysis);
  const hiddenSignals = getHiddenSignals(input.analysis, snapshot, input.extractionDiagnostics);
  const dimensions = buildDimensions(snapshot, input.analysis);
  const dynamicActions = buildDynamicActions({
    snapshot,
    employerContext,
    similarOffers: input.similarOffers || [],
  });
  const primaryAction = dynamicActions.find((action) => action.kind === 'primary') || null;

  return {
    analysis: input.analysis,
    offer: input.offer,
    extractedOffer: input.extractedOffer,
    extractionDiagnostics: input.extractionDiagnostics,
    snapshot,
    employerContext,
    similarOffers: input.similarOffers || [],
    dynamicActions,
    primaryAction,
    reviewAwareSignal: getReviewAwareSignal(input.analysis, snapshot, employerContext),
    positives: getPositiveSignals(input.analysis, snapshot),
    concerns: getConcernSignals(input.analysis, snapshot, input.extractionDiagnostics),
    recruiterQuestions,
    interviewTopics,
    missingInformation,
    hiddenSignals,
    dimensions,
    nextStep: getPrimaryNextStep(input.analysis, snapshot),
    confidence: getConfidenceMeta(input.analysis, snapshot),
    verdict: getVerdictMeta(input.analysis, snapshot),
    resultSteps: RESULT_STEPS,
    journey: {
      currentStep: 4,
      totalSteps: 5,
      finalStepTitle: 'Save, compare, and follow up',
    },
  };
}

export function getToneClasses(tone: JobOfferDecisionWorkspace['verdict']['tone'] | JobOfferReviewAwareSignal['tone']) {
  if (tone === 'positive') {
    return {
      surface: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }
  if (tone === 'warning') {
    return {
      surface: 'border-amber-200 bg-amber-50/80 text-amber-950',
      badge: 'border-amber-200 bg-amber-50 text-amber-900',
    };
  }
  if (tone === 'caution') {
    return {
      surface: 'border-rose-200 bg-rose-50/80 text-rose-950',
      badge: 'border-rose-200 bg-rose-50 text-rose-900',
    };
  }
  return {
    surface: 'border-slate-200 bg-slate-50/80 text-slate-900',
    badge: 'border-slate-200 bg-white text-slate-900',
  };
}

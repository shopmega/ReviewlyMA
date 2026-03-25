import type {
  JobOfferAnalysisRecord,
  JobOfferContractType,
  JobOfferDecisionTier,
  JobOfferDecisionWorkspace,
  JobOfferDecisionWorkspaceStep,
  JobOfferDynamicAction,
  JobOfferEmployerContext,
  JobOfferExtractionConfidence,
  JobOfferExtractionDiagnostics,
  JobOfferExtractionResult,
  JobOfferNegotiationScript,
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
    label: 'jobOffers.workspace.steps.offer.label',
    title: 'jobOffers.workspace.steps.offer.title',
    body: 'jobOffers.workspace.steps.offer.body',
  },
  {
    key: 'employer',
    label: 'jobOffers.workspace.steps.employer.label',
    title: 'jobOffers.workspace.steps.employer.title',
    body: 'jobOffers.workspace.steps.employer.body',
  },
  {
    key: 'compare',
    label: 'jobOffers.workspace.steps.compare.label',
    title: 'jobOffers.workspace.steps.compare.title',
    body: 'jobOffers.workspace.steps.compare.body',
  },
  {
    key: 'actions',
    label: 'jobOffers.workspace.steps.actions.label',
    title: 'jobOffers.workspace.steps.actions.title',
    body: 'jobOffers.workspace.steps.actions.body',
  },
  {
    key: 'details',
    label: 'jobOffers.workspace.steps.details.label',
    title: 'jobOffers.workspace.steps.details.title',
    body: 'jobOffers.workspace.steps.details.body',
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

export function formatContractType(type?: string | null): string {
  if (!type) return 'jobOffers.workspace.formatting.notSpecified';
  if (type.toLowerCase() === 'internship') return 'jobOffers.workspace.formatting.internship';
  return type;
}

export function formatWorkModel(model?: string | null): string {
  if (!model) return 'jobOffers.workspace.formatting.notSpecified';
  if (model.toLowerCase() === 'onsite') return 'jobOffers.workspace.formatting.onsite';
  if (model.toLowerCase() === 'hybrid') return 'jobOffers.workspace.formatting.hybrid';
  if (model.toLowerCase() === 'remote') return 'jobOffers.workspace.formatting.remote';
  return model;
}

export function formatSourceType(sourceType?: string | null): string {
  if (!sourceType) return 'jobOffers.workspace.formatting.notSpecified';
  if (sourceType === 'url') return 'jobOffers.workspace.formatting.linkSource';
  if (sourceType === 'text') return 'jobOffers.workspace.formatting.pastedText';
  if (sourceType === 'document') return 'jobOffers.workspace.formatting.document';
  return sourceType || '';
}

export function formatBenchmarkSource(source?: string | null): string {
  if (!source) return 'jobOffers.workspace.formatting.noBenchmark';
  if (source === 'role_city') return 'jobOffers.workspace.formatting.roleCityBenchmark';
  if (source === 'company') return 'jobOffers.workspace.formatting.companyBenchmark';
  if (source === 'city') return 'jobOffers.workspace.formatting.cityBenchmark';
  return source;
}

export function formatEmployerSignal(signal?: string): string {
  if (signal === 'strong') return 'jobOffers.workspace.formatting.strongSignal';
  if (signal === 'mixed') return 'jobOffers.workspace.formatting.mixedSignal';
  return 'jobOffers.workspace.formatting.limitedSignal';
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
      signal_summary: 'jobOffers.workspace.employerSignal.strong',
    };
  }

  if (reviewCount >= 8 || salarySubmissionCount >= 3 || isVerified) {
    return {
      signal_label: 'mixed',
      signal_summary: 'jobOffers.workspace.employerSignal.mixed',
    };
  }

  return {
    signal_label: 'limited',
    signal_summary: 'jobOffers.workspace.employerSignal.limited',
  };
}

export function buildSimilarOfferLabel(options: {
  overallOfferScore: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
}): string {
  if (options.salaryMin == null && options.salaryMax == null) {
    return 'jobOffers.workspace.formatting.limitedSalaryVisibility';
  }
  if (options.overallOfferScore >= 80) {
    return 'jobOffers.workspace.formatting.strongerMarketSignal';
  }
  if (options.overallOfferScore >= 65) {
    return 'jobOffers.workspace.formatting.clearerThanAverage';
  }
  return 'jobOffers.workspace.formatting.comparableNearbyOption';
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

  const jobTitle = extractedOffer?.jobTitle || offer?.job_title || 'jobOffers.workspace.formatting.unclearRole';
  const city = extractedOffer?.city || offer?.city || null;
  const citySlug = offer?.city_slug || (city ? slugify(city) : null);

  return {
    companyName: extractedOffer?.companyName || offer?.company_name || 'jobOffers.workspace.formatting.unknownCompany',
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
  if (salaryMin == null && salaryMax == null) return 'jobOffers.workspace.formatting.notDisclosed';
  if (salaryMin != null && salaryMax != null) {
    return `${formatMoney(salaryMin)} - ${formatMoney(salaryMax)} MAD / ${formatPayPeriod(payPeriod)}`;
  }
  return `${formatMoney(salaryMin ?? salaryMax ?? 0)} MAD / ${formatPayPeriod(payPeriod)}`;
}

export function getFieldConfidenceLabel(confidence?: JobOfferExtractionConfidence) {
  if (!confidence) return 'jobOffers.workspace.formatting.saved';
  return confidence;
}

export function getFieldStatusLabel(confidence?: JobOfferExtractionConfidence) {
  if (!confidence) return 'jobOffers.workspace.status.needsVerification';
  if (confidence === 'high') return 'jobOffers.workspace.status.confirmed';
  if (confidence === 'medium') return 'jobOffers.workspace.status.likely';
  if (confidence === 'low') return 'jobOffers.workspace.status.limitedConfidence';
  return 'jobOffers.workspace.status.notDetected';
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
    signal_summary: 'jobOffers.workspace.employerSignal.limited',
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
      label: 'jobOffers.workspace.presentation.salaryMissing',
      value: 'jobOffers.workspace.formatting.notDisclosed',
      note: 'jobOffers.workspace.presentation.salaryMissingNote',
      tone: 'warning' as const,
    };
  }

  if (!highConfidence && diagnostics) {
    return {
      label: 'jobOffers.workspace.presentation.salaryMentioned',
      value: formatSalary(snapshot),
      note: 'jobOffers.workspace.presentation.salaryMentionedNote',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'jobOffers.workspace.presentation.salaryVisible',
    value: formatSalary(snapshot),
    note: 'jobOffers.workspace.presentation.salaryVisibleNote',
    tone: 'positive' as const,
  };
}

function getConfidenceMeta(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (analysis.confidence_level === 'high') {
    return {
      score: 86,
      label: 'jobOffers.workspace.confidence.high.label',
      note: 'jobOffers.workspace.confidence.high.note',
    };
  }

  if (analysis.confidence_level === 'medium') {
    return {
      score: 60,
      label: 'jobOffers.workspace.confidence.medium.label',
      note: 'jobOffers.workspace.confidence.medium.note',
    };
  }

  return {
    score: hasSalary ? 28 : 18,
    label: 'jobOffers.workspace.confidence.low.label',
    note: hasSalary
      ? 'jobOffers.workspace.confidence.low.note'
      : 'jobOffers.workspace.confidence.low.noteNoSalary',
  };
}

function getVerdictMeta(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const canAssessCompensation = hasSalary && analysis.benchmark_primary_source && analysis.benchmark_primary_source !== 'none';

  if (!canAssessCompensation || analysis.market_position_label === 'insufficient_data') {
    return {
      eyebrow: 'jobOffers.workspace.verdicts.incomplete.eyebrow',
      title: hasSalary ? 'jobOffers.workspace.verdicts.incomplete.title' : 'jobOffers.workspace.verdicts.incomplete.titleNoSalary',
      summary: hasSalary
        ? 'jobOffers.workspace.verdicts.incomplete.summary'
        : 'jobOffers.workspace.verdicts.incomplete.summaryNoSalary',
      tone: 'warning' as const,
    };
  }

  if (analysis.market_position_label === 'strong_offer') {
    return {
      eyebrow: 'jobOffers.workspace.verdicts.strong.eyebrow',
      title: 'jobOffers.workspace.verdicts.strong.title',
      summary: 'jobOffers.workspace.verdicts.strong.summary',
      tone: 'positive' as const,
    };
  }

  if (analysis.market_position_label === 'above_market') {
    return {
      eyebrow: 'jobOffers.workspace.verdicts.above.eyebrow',
      title: 'jobOffers.workspace.verdicts.above.title',
      summary: 'jobOffers.workspace.verdicts.above.summary',
      tone: 'neutral' as const,
    };
  }

  if (analysis.market_position_label === 'fair_market') {
    return {
      eyebrow: 'jobOffers.workspace.verdicts.fair.eyebrow',
      title: 'jobOffers.workspace.verdicts.fair.title',
      summary: 'jobOffers.workspace.verdicts.fair.summary',
      tone: 'neutral' as const,
    };
  }

  return {
    eyebrow: 'jobOffers.workspace.verdicts.weak.eyebrow',
    title: 'jobOffers.workspace.verdicts.weak.title',
    summary: 'jobOffers.workspace.verdicts.weak.summary',
    tone: 'caution' as const,
  };
}

function getPositiveSignals(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
  const positives = [...analysis.strengths];

  if (hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    positives.push('jobOffers.workspace.signals.positives.salaryDisclosed');
  }
  if (snapshot.contractType) {
    positives.push('jobOffers.workspace.signals.positives.contractStated');
  }
  if (snapshot.workModel) {
    positives.push('jobOffers.workspace.signals.positives.workModelStated');
  }
  if (snapshot.city) {
    positives.push('jobOffers.workspace.signals.positives.cityStated');
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
    if (flag === 'missing_salary') concerns.push('jobOffers.workspace.signals.concerns.salaryMissing');
    if (flag === 'wide_salary_range') concerns.push('jobOffers.workspace.signals.concerns.wideRange');
    if (flag === 'missing_location') concerns.push('jobOffers.workspace.signals.concerns.missingLocation');
    if (flag === 'missing_contract_type') concerns.push('jobOffers.workspace.signals.concerns.missingContract');
    if (flag === 'missing_work_model') concerns.push('jobOffers.workspace.signals.concerns.missingWorkModel');
    if (flag === 'missing_seniority') concerns.push('jobOffers.workspace.signals.concerns.missingSeniority');
    if (flag === 'low_benchmark_confidence') concerns.push('jobOffers.workspace.signals.concerns.lowConfidence');
  }

  const companyConfidence = diagnostics?.fieldDiagnostics.companyName?.confidence;
  if (companyConfidence === 'low' || companyConfidence === 'none') {
    concerns.push('jobOffers.workspace.signals.concerns.lowCompanyConfidence');
  }

  const titleConfidence = diagnostics?.fieldDiagnostics.jobTitle?.confidence;
  if (titleConfidence === 'low' || titleConfidence === 'none') {
    concerns.push('jobOffers.workspace.signals.concerns.lowTitleConfidence');
  }

  if (!snapshot.benefits.length) {
    concerns.push('jobOffers.workspace.signals.concerns.noBenefits');
  }

  return Array.from(new Set(concerns)).slice(0, 4);
}

function getStrategicGaps(snapshot: JobOfferWorkspaceSnapshot): StrategicGap[] {
  const gaps: StrategicGap[] = [];

  if (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    gaps.push({
      title: 'jobOffers.workspace.gaps.salary.title',
      insight: 'jobOffers.workspace.gaps.salary.insight',
      action: 'jobOffers.workspace.gaps.salary.action',
    });
  }
  if (!snapshot.contractType) {
    gaps.push({
      title: 'jobOffers.workspace.gaps.contract.title',
      insight: 'jobOffers.workspace.gaps.contract.insight',
      action: 'jobOffers.workspace.gaps.contract.action',
    });
  }
  if (!snapshot.workModel) {
    gaps.push({
      title: 'jobOffers.workspace.gaps.workModel.title',
      insight: 'jobOffers.workspace.gaps.workModel.insight',
      action: 'jobOffers.workspace.gaps.workModel.action',
    });
  }
  if (!snapshot.benefits.length) {
    gaps.push({
      title: 'jobOffers.workspace.gaps.benefits.title',
      insight: 'jobOffers.workspace.gaps.benefits.insight',
      action: 'jobOffers.workspace.gaps.benefits.action',
    });
  }
  if (!snapshot.seniorityLevel) {
    gaps.push({
      title: 'jobOffers.workspace.gaps.seniority.title',
      insight: 'jobOffers.workspace.gaps.seniority.insight',
      action: 'jobOffers.workspace.gaps.seniority.action',
    });
  }

  return gaps.slice(0, 4);
}

function getRecruiterQuestions(snapshot: JobOfferWorkspaceSnapshot, gaps: StrategicGap[]) {
  const questions = gaps.map((gap) => gap.action.replace(/\.$/, '?'));

  if (!snapshot.city) {
    questions.push('jobOffers.workspace.questions.cityRelocation');
  }
  if (hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    questions.push('jobOffers.workspace.questions.packageStructure');
  }

  questions.push('jobOffers.workspace.questions.reportingTeam');
  questions.push('jobOffers.workspace.questions.performanceSuccess');

  return Array.from(new Set(questions)).slice(0, 5);
}

function getInterviewTopics(snapshot: JobOfferWorkspaceSnapshot, analysis: AnalysisView) {
  const topics = [
    'jobOffers.workspace.topics.roleScope',
    'jobOffers.workspace.topics.teamStructure',
  ];

  if (!hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax)) {
    topics.push('jobOffers.workspace.topics.compensationVague');
  }
 else {
    topics.push('jobOffers.workspace.topics.packageDetails');
  }

  if (!snapshot.workModel) {
    topics.push('jobOffers.workspace.topics.workModelVague');
  }
 else if (snapshot.workModel === 'remote') {
    topics.push('jobOffers.workspace.topics.remoteStyle');
  } else if (snapshot.workModel === 'hybrid') {
    topics.push('jobOffers.workspace.topics.hybridRhythm');
  }
 else {
    topics.push('jobOffers.workspace.topics.onsiteCommute');
  }

  if (analysis.quality_score >= 75) {
    topics.push('jobOffers.workspace.topics.growthPath');
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
    signals.push('jobOffers.workspace.signals.hidden.noSalaryLeverage');
  }
  if (analysis.risk_flags.includes('wide_salary_range')) {
    signals.push('jobOffers.workspace.signals.hidden.wideRangeLeverage');
  }
  if (!snapshot.contractType && !snapshot.workModel) {
    signals.push('jobOffers.workspace.signals.hidden.vagueConditions');
  }
  if (diagnostics?.fieldDiagnostics.companyName?.confidence === 'low') {
    signals.push('jobOffers.workspace.signals.hidden.verifyCompany');
  }
  if (analysis.confidence_level === 'low') {
    signals.push('jobOffers.workspace.signals.hidden.clarificationOnly');
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
      title: 'jobOffers.workspace.dimensions.clarity.title',
      value: Math.round(analysis.transparency_score),
      label: analysis.transparency_score >= 75 ? 'jobOffers.workspace.dimensions.clarity.labels.clear' : analysis.transparency_score >= 50 ? 'jobOffers.workspace.dimensions.clarity.labels.mixed' : 'jobOffers.workspace.dimensions.clarity.labels.vague',
      note: 'jobOffers.workspace.dimensions.clarity.note',
    },
    {
      title: 'jobOffers.workspace.dimensions.compensation.title',
      value: compensationVisibility,
      label: compensationVisibility >= 75 ? 'jobOffers.workspace.dimensions.compensation.labels.assessable' : compensationVisibility >= 50 ? 'jobOffers.workspace.dimensions.compensation.labels.partial' : 'jobOffers.workspace.dimensions.compensation.labels.withheld',
      note: hasSalary
        ? 'jobOffers.workspace.dimensions.compensation.note'
        : 'jobOffers.workspace.dimensions.compensation.noteHidden',
    },
    {
      title: 'jobOffers.workspace.dimensions.conditions.title',
      value: workConditionsVisibility,
      label: workConditionsVisibility >= 75 ? 'jobOffers.workspace.dimensions.conditions.labels.defined' : workConditionsVisibility >= 45 ? 'jobOffers.workspace.dimensions.conditions.labels.partly' : 'jobOffers.workspace.dimensions.conditions.labels.unclear',
      note: 'jobOffers.workspace.dimensions.conditions.note',
    },
    {
      title: 'jobOffers.workspace.dimensions.value.title',
      value: careerValue,
      label: careerValue >= 75 ? 'jobOffers.workspace.dimensions.value.labels.strong' : careerValue >= 50 ? 'jobOffers.workspace.dimensions.value.labels.validation' : 'jobOffers.workspace.dimensions.value.labels.thin',
      note: 'jobOffers.workspace.dimensions.value.note',
    },
    {
      title: 'jobOffers.workspace.dimensions.benchmark.title',
      value: benchmarkConfidence,
      label: analysis.confidence_level === 'high' ? 'jobOffers.workspace.confidence.high.label' : analysis.confidence_level === 'medium' ? 'jobOffers.workspace.confidence.medium.label' : 'jobOffers.workspace.confidence.low.label',
      note: 'jobOffers.workspace.dimensions.benchmark.note',
    },
    {
      title: 'jobOffers.workspace.dimensions.risk.title',
      value: riskLevel,
      label: riskLevel >= 70 ? 'jobOffers.workspace.dimensions.risk.labels.high' : riskLevel >= 40 ? 'jobOffers.workspace.dimensions.risk.labels.moderate' : 'jobOffers.workspace.dimensions.risk.labels.low',
      note: 'jobOffers.workspace.dimensions.risk.note',
      kind: 'risk',
    },
  ];
}

function getPrimaryNextStep(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot) {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);

  if (!hasSalary) {
    return 'jobOffers.workspace.nextStep.askSalary';
  }

  if (analysis.confidence_level === 'low') {
    return 'jobOffers.workspace.nextStep.lowConfidence';
  }

  if (analysis.market_position_label === 'below_market') {
    return 'jobOffers.workspace.nextStep.belowMarket';
  }

  if (analysis.market_position_label === 'strong_offer' || analysis.market_position_label === 'above_market') {
    return 'jobOffers.workspace.nextStep.strongOffer';
  }

  return 'jobOffers.workspace.nextStep.baseline';
}

function getDecisionTier(analysis: AnalysisView, snapshot: JobOfferWorkspaceSnapshot): JobOfferDecisionTier {
  const hasSalary = hasUsableSalary(snapshot.salaryMin, snapshot.salaryMax);
  const hasBenchmark = analysis.benchmark_primary_source && analysis.benchmark_primary_source !== 'none';

  if (!hasSalary || !hasBenchmark || analysis.market_position_label === 'insufficient_data') {
    return 'negotiate'; // not enough info → ask before deciding
  }
  if (analysis.market_position_label === 'strong_offer') return 'accept';
  if (analysis.market_position_label === 'above_market') return 'accept';
  if (analysis.market_position_label === 'fair_market') return 'negotiate';
  return 'avoid'; // below_market
}

function getSalaryGapPercent(analysis: AnalysisView): number | null {
  // market_delta_percent is computed in scoring.ts and passed through as part of AnalysisView
  // We need to check if it exists on the extended type; use type assertion for the extra field
  const extended = analysis as AnalysisView & { market_delta_percent?: number | null };
  return extended.market_delta_percent ?? null;
}

function buildNegotiationScript(
  snapshot: JobOfferWorkspaceSnapshot,
  analysis: AnalysisView,
  tier: JobOfferDecisionTier
): JobOfferNegotiationScript | null {
  if (tier === 'accept') return null;

  const benchmarkMedian = analysis.benchmark_role_city_median
    ?? analysis.benchmark_city_median
    ?? null;

  // Suggested ask: benchmark + 12% buffer (rounded to nearest 100 MAD)
  const suggestedMonthlyAsk = benchmarkMedian != null
    ? Math.round((benchmarkMedian * 1.12) / 100) * 100
    : null;

  const currentMidpoint = snapshot.salaryMin != null && snapshot.salaryMax != null
    ? Math.round((snapshot.salaryMin + snapshot.salaryMax) / 2)
    : snapshot.salaryMin ?? snapshot.salaryMax ?? null;

  const askDelta = suggestedMonthlyAsk != null && currentMidpoint != null
    ? suggestedMonthlyAsk - currentMidpoint
    : null;

  const suggestedAskLabel = suggestedMonthlyAsk != null
    ? askDelta != null && askDelta > 0
      ? `+${formatMoney(askDelta)} MAD / mois`
      : `${formatMoney(suggestedMonthlyAsk)} MAD / mois`
    : 'jobOffers.negotiation.askBasedOnMarket';

  const role = snapshot.jobTitle;
  const company = snapshot.companyName;
  const askAmount = suggestedMonthlyAsk != null ? `${formatMoney(suggestedMonthlyAsk)} MAD/mois` : '[montant cible]';

  const emailTemplate = `Objet : Retour sur l'offre — ${role} chez ${company}

Bonjour,

Merci pour cette opportunité. Après analyse du marché pour ce profil au Maroc, je souhaiterais discuter de la rémunération.

Sous réserve de validation mutuelle, je revendrais vers un package mensuel autour de ${askAmount}, en ligne avec les benchmarks actuels pour ce type de poste.

Je reste disponible pour en discuter et avancer rapidement.

Cordialement`;

  const whatsappTemplate = `Bonjour 👋 Merci pour l'offre sur le poste de ${role}.
Après vérification du marché, je vise plutôt ${askAmount} / mois — on peut en parler ?`;

  return {
    suggestedMonthlyAsk,
    suggestedAskLabel,
    emailTemplate,
    whatsappTemplate,
  };
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
      title: 'jobOffers.workspace.actions.ask_salary.title',
      body: 'jobOffers.workspace.actions.ask_salary.body',
      href: '#actions-step',
      kind: 'primary',
      placement: 'hero',
      cta_id: 'ask_salary_before_continuing',
    });
  } else if (employerMixedOrWeak) {
    addAction({
      id: 'review_employer_before_applying',
      title: 'jobOffers.workspace.actions.review_employer.title',
      body: 'jobOffers.workspace.actions.review_employer.body',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'review_employer_before_applying',
    });
  } else if (hasStrongComparableCoverage) {
    addAction({
      id: 'compare_with_similar_offers',
      title: 'jobOffers.workspace.actions.compare_offers.title',
      body: 'jobOffers.workspace.actions.compare_offers.body',
      href: '#compare-step',
      kind: 'primary',
      placement: 'hero',
      cta_id: 'compare_with_similar_offers',
    });
  } else if (salaryHref) {
    addAction({
      id: 'check_salary_benchmarks',
      title: 'jobOffers.workspace.actions.check_benchmarks.title',
      body: 'jobOffers.workspace.actions.check_benchmarks.body',
      href: salaryHref,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'check_salary_benchmarks',
    });
  } else if (employerFull) {
    addAction({
      id: 'view_company_reviews',
      title: 'jobOffers.workspace.actions.view_company.title',
      body: 'jobOffers.workspace.actions.view_company.body',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: 'primary',
      placement: 'hero',
      cta_id: 'view_company_reviews',
    });
  }

  if (employerFull) {
    addAction({
      id: 'view_company_reviews',
      title: 'jobOffers.workspace.actions.view_company_rail.title',
      body: 'jobOffers.workspace.actions.view_company_rail.body',
      href: `/businesses/${options.employerContext.business_slug}/reviews`,
      kind: actions.length === 0 ? 'primary' : 'secondary',
      placement: 'rail',
      cta_id: 'view_company_reviews',
    });
    addAction({
      id: 'open_company_page',
      title: 'jobOffers.workspace.actions.open_company_page.title',
      body: 'jobOffers.workspace.actions.open_company_page.body',
      href: `/businesses/${options.employerContext.business_slug}`,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'open_company_page',
    });
    addAction({
      id: 'open_company_salary_page',
      title: 'jobOffers.workspace.actions.open_company_salary.title',
      body: 'jobOffers.workspace.actions.open_company_salary.body',
      href: `/businesses/${options.employerContext.business_slug}/salaries`,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'open_company_salary_page',
    });
  }

  if (hasStrongComparableCoverage) {
    addAction({
      id: 'compare_with_similar_offers',
      title: 'jobOffers.workspace.actions.compare_offers.title',
      body: 'jobOffers.workspace.actions.compare_offers.body',
      href: '#compare-step',
      kind: actions.length === 0 ? 'primary' : 'secondary',
      placement: 'rail',
      cta_id: 'compare_with_similar_offers',
    });
  }

  if (salaryHref) {
    addAction({
      id: 'check_salary_benchmarks',
      title: 'jobOffers.workspace.actions.check_benchmarks.title',
      body: 'jobOffers.workspace.actions.check_benchmarks.body',
      href: salaryHref,
      kind: 'secondary',
      placement: 'rail',
      cta_id: 'check_salary_benchmarks',
    });
  }

  addAction({
    id: 'use_recruiter_questions',
    title: 'jobOffers.workspace.actions.use_questions.title',
    body: 'jobOffers.workspace.actions.use_questions.body',
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
      title: 'jobOffers.workspace.signals.reviewAware.mixedSentiment.title',
      body: 'jobOffers.workspace.signals.reviewAware.mixedSentiment.body',
      tone: 'caution',
    };
  }

  if (analysis.overall_offer_score >= 55 && rating < 3.3) {
    return {
      title: 'jobOffers.workspace.signals.reviewAware.weakReputation.title',
      body: 'jobOffers.workspace.signals.reviewAware.weakReputation.body',
      tone: 'caution',
    };
  }

  if (analysis.overall_offer_score >= 82 && rating >= 4) {
    return {
      title: 'jobOffers.workspace.signals.reviewAware.positiveReinforcement.title',
      body: 'jobOffers.workspace.signals.reviewAware.positiveReinforcement.body',
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
  const decisionTier = getDecisionTier(input.analysis, snapshot);
  const salaryGapPercent = getSalaryGapPercent(input.analysis);
  const negotiationScript = buildNegotiationScript(snapshot, input.analysis, decisionTier);

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
    decisionTier,
    salaryGapPercent,
    negotiationScript,
    resultSteps: RESULT_STEPS,
    journey: {
      currentStep: 4,
      totalSteps: 5,
      finalStepTitle: 'jobOffers.workspace.journey.finalStep',
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

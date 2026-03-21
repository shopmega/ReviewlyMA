import type {
  JobOfferAnalysisRecord,
  JobOfferConfidenceLevel,
  JobOfferRecommendationLabel,
  JobOfferRiskFlag,
} from '@/lib/types';
import type { JobOfferBenchmarks } from './benchmarks';
import type { NormalizedJobOfferInput } from './normalization';
import { JOB_OFFER_ANALYSIS_VERSION } from './constants';

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function getConfidenceLevel(
  input: NormalizedJobOfferInput,
  sampleCount: number,
  hasPrimaryBenchmark: boolean
): JobOfferConfidenceLevel {
  const hasSalary = input.salaryMinMonthly != null || input.salaryMaxMonthly != null;
  if (!hasSalary) return 'low';
  if (!hasPrimaryBenchmark || sampleCount < 5) return 'low';
  if (sampleCount < 15) return 'medium';
  return 'high';
}

function getRecommendationLabel(
  overallScore: number,
  benchmarkAvailable: boolean,
  hasSalary: boolean
): JobOfferRecommendationLabel {
  if (!benchmarkAvailable || !hasSalary) return 'insufficient_data';
  if (overallScore < 45) return 'below_market';
  if (overallScore < 65) return 'fair_market';
  if (overallScore < 82) return 'above_market';
  return 'strong_offer';
}

function getCompensationScore(midpointMonthly: number | null, benchmarkMedian: number | null) {
  if (midpointMonthly == null || benchmarkMedian == null || benchmarkMedian <= 0) return 50;
  const ratio = midpointMonthly / benchmarkMedian;
  if (ratio <= 0.75) return 20;
  if (ratio <= 0.9) return 40;
  if (ratio <= 1.05) return 62;
  if (ratio <= 1.2) return 78;
  if (ratio <= 1.4) return 90;
  return 95;
}

function getTransparencyScore(input: NormalizedJobOfferInput) {
  let score = 20;
  if (input.salaryMinMonthly != null || input.salaryMaxMonthly != null) score += 25;
  if (input.salaryMinMonthly != null && input.salaryMaxMonthly != null) score += 15;
  if (input.contractType) score += 10;
  if (input.workModel) score += 10;
  if (input.seniorityLevel) score += 10;
  if (input.city) score += 5;
  if (input.benefits.length > 0) score += Math.min(input.benefits.length * 2, 10);
  if (input.sourceText) score += 5;
  return clamp(score);
}

function getQualityScore(input: NormalizedJobOfferInput) {
  let score = 55;
  if (input.companyName.length >= 3) score += 10;
  if (input.jobTitle.length >= 3) score += 10;
  if (input.yearsExperienceRequired != null) score += 5;
  if (input.salaryMinMonthly != null && input.salaryMaxMonthly != null) {
    const width = input.salaryMaxMonthly - input.salaryMinMonthly;
    if (width > 0 && input.salaryMinMonthly > 0) {
      const widthRatio = width / input.salaryMinMonthly;
      if (widthRatio <= 0.35) score += 10;
      if (widthRatio > 1.2) score -= 12;
    }
  }
  if (!input.city) score -= 8;
  if (!input.contractType) score -= 6;
  if (!input.workModel) score -= 6;
  return clamp(score);
}

function getMarketAlignmentScore(midpointMonthly: number | null, benchmarks: JobOfferBenchmarks) {
  const benchmarkMedian = benchmarks.primaryMedianMonthly;
  if (midpointMonthly == null || benchmarkMedian == null || benchmarkMedian <= 0) return 45;

  const deltaRatio = Math.abs(midpointMonthly - benchmarkMedian) / benchmarkMedian;
  if (deltaRatio <= 0.05) return 88;
  if (deltaRatio <= 0.12) return 78;
  if (deltaRatio <= 0.2) return 65;
  if (deltaRatio <= 0.35) return 52;
  return 38;
}

function getRiskFlags(input: NormalizedJobOfferInput, confidence: JobOfferConfidenceLevel): JobOfferRiskFlag[] {
  const flags: JobOfferRiskFlag[] = [];

  if (input.salaryMinMonthly == null && input.salaryMaxMonthly == null) flags.push('missing_salary');
  if (input.salaryMinMonthly != null && input.salaryMaxMonthly != null) {
    const spread = input.salaryMaxMonthly - input.salaryMinMonthly;
    if (input.salaryMinMonthly > 0 && spread / input.salaryMinMonthly > 0.8) flags.push('wide_salary_range');
  }
  if (!input.city) flags.push('missing_location');
  if (!input.contractType) flags.push('missing_contract_type');
  if (!input.workModel) flags.push('missing_work_model');
  if (!input.seniorityLevel) flags.push('missing_seniority');
  if (confidence === 'low') flags.push('low_benchmark_confidence');

  return flags;
}

function getStrengths(input: NormalizedJobOfferInput, compensationScore: number, transparencyScore: number): string[] {
  const strengths: string[] = [];
  if (compensationScore >= 75) strengths.push('Compensation appears strong versus current benchmarks.');
  if (transparencyScore >= 75) strengths.push('The offer includes a relatively clear set of structured details.');
  if (input.benefits.length >= 3) strengths.push('The offer mentions multiple benefits, which improves package visibility.');
  if (input.workModel) strengths.push(`Work model is explicitly stated as ${input.workModel}.`);
  return strengths.slice(0, 4);
}

function getMissingInformation(input: NormalizedJobOfferInput): string[] {
  const missing: string[] = [];
  if (input.salaryMinMonthly == null && input.salaryMaxMonthly == null) missing.push('Compensation is not disclosed.');
  if (!input.city) missing.push('City or market location is missing.');
  if (!input.contractType) missing.push('Contract type is missing.');
  if (!input.workModel) missing.push('Work model is missing.');
  if (!input.seniorityLevel) missing.push('Seniority level is missing.');
  return missing;
}

function buildSummary(label: JobOfferRecommendationLabel, confidence: JobOfferConfidenceLevel, benchmarkSource: string) {
  if (label === 'insufficient_data') {
    return 'The offer contains useful signals, but there is not enough evidence for a reliable market verdict yet.';
  }

  const labelText = label.replace(/_/g, ' ');
  const confidenceText = confidence === 'high' ? 'high' : confidence === 'medium' ? 'medium' : 'low';
  const benchmarkText = benchmarkSource === 'none' ? 'limited market data' : `${benchmarkSource.replace('_', ' ')} benchmarks`;
  return `Offer classified as ${labelText} using ${benchmarkText} with ${confidenceText} confidence.`;
}

export type ComputedJobOfferAnalysis = Omit<JobOfferAnalysisRecord, 'id' | 'job_offer_id' | 'created_at'>;

export function computeJobOfferAnalysis(
  input: NormalizedJobOfferInput,
  benchmarks: JobOfferBenchmarks
): ComputedJobOfferAnalysis {
  const hasSalary = input.salaryMinMonthly != null || input.salaryMaxMonthly != null;
  const confidenceLevel = getConfidenceLevel(input, benchmarks.sampleCount, benchmarks.primaryMedianMonthly != null);
  const compensationScore = getCompensationScore(input.midpointMonthly, benchmarks.primaryMedianMonthly);
  const transparencyScore = getTransparencyScore(input);
  const qualityScore = getQualityScore(input);
  const marketAlignmentScore = getMarketAlignmentScore(input.midpointMonthly, benchmarks);

  const overallOfferScore = round(
    (compensationScore * 0.35)
    + (marketAlignmentScore * 0.25)
    + (transparencyScore * 0.2)
    + (qualityScore * 0.2)
  );

  const marketPositionLabel = getRecommendationLabel(
    overallOfferScore,
    benchmarks.primaryMedianMonthly != null,
    hasSalary
  );
  const riskFlags = getRiskFlags(input, confidenceLevel);
  const missingInformation = getMissingInformation(input);
  const strengths = getStrengths(input, compensationScore, transparencyScore);

  return {
    analysis_version: JOB_OFFER_ANALYSIS_VERSION,
    overall_offer_score: overallOfferScore,
    compensation_score: round(compensationScore),
    market_alignment_score: round(marketAlignmentScore),
    transparency_score: round(transparencyScore),
    quality_score: round(qualityScore),
    market_position_label: marketPositionLabel,
    confidence_level: confidenceLevel,
    benchmark_role_city_median: benchmarks.roleCity?.median_monthly_salary ?? null,
    benchmark_company_median: benchmarks.company?.median_monthly_salary ?? null,
    benchmark_city_median: benchmarks.city?.median_monthly_salary ?? null,
    benchmark_primary_source: benchmarks.primarySource,
    risk_flags: riskFlags,
    missing_information: missingInformation,
    strengths,
    analysis_summary: buildSummary(marketPositionLabel, confidenceLevel, benchmarks.primarySource),
  };
}

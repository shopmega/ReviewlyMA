import type { JobOfferRecord, JobOfferSubmissionInput } from '@/lib/types';
import { slugify } from '@/lib/utils';

function cleanText(value: string | undefined | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : null;
}

function normalizePayPeriod(
  minValue: number | null,
  maxValue: number | null,
  payPeriod: 'monthly' | 'yearly'
) {
  if (payPeriod === 'monthly') {
    return { salaryMinMonthly: minValue, salaryMaxMonthly: maxValue };
  }

  return {
    salaryMinMonthly: minValue != null ? Number((minValue / 12).toFixed(2)) : null,
    salaryMaxMonthly: maxValue != null ? Number((maxValue / 12).toFixed(2)) : null,
  };
}

export type NormalizedJobOfferInput = {
  companyName: string;
  jobTitle: string;
  jobTitleNormalized: string;
  city: string | null;
  citySlug: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryMinMonthly: number | null;
  salaryMaxMonthly: number | null;
  midpointMonthly: number | null;
  payPeriod: 'monthly' | 'yearly';
  contractType: JobOfferRecord['contract_type'];
  workModel: JobOfferRecord['work_model'];
  seniorityLevel: JobOfferRecord['seniority_level'];
  yearsExperienceRequired: number | null;
  benefits: string[];
  sourceText: string | null;
  sourceType: JobOfferRecord['source_type'];
  sourceUrl: string | null;
  documentName: string | null;
};

export function normalizeJobOfferInput(input: JobOfferSubmissionInput): NormalizedJobOfferInput {
  const salaryMin = typeof input.salaryMin === 'number' ? input.salaryMin : null;
  const salaryMax = typeof input.salaryMax === 'number' ? input.salaryMax : null;
  const payPeriod = input.payPeriod ?? 'monthly';
  const { salaryMinMonthly, salaryMaxMonthly } = normalizePayPeriod(salaryMin, salaryMax, payPeriod);

  const midpointMonthly = salaryMinMonthly != null && salaryMaxMonthly != null
    ? Number(((salaryMinMonthly + salaryMaxMonthly) / 2).toFixed(2))
    : salaryMinMonthly ?? salaryMaxMonthly;

  return {
    companyName: cleanText(input.companyName) || '',
    jobTitle: cleanText(input.jobTitle) || '',
    jobTitleNormalized: slugify(cleanText(input.jobTitle) || ''),
    city: cleanText(input.city),
    citySlug: cleanText(input.city) ? slugify(cleanText(input.city) as string) : null,
    salaryMin,
    salaryMax,
    salaryMinMonthly,
    salaryMaxMonthly,
    midpointMonthly,
    payPeriod,
    contractType: input.contractType ?? null,
    workModel: input.workModel ?? null,
    seniorityLevel: input.seniorityLevel ?? null,
    yearsExperienceRequired: typeof input.yearsExperienceRequired === 'number' ? input.yearsExperienceRequired : null,
    benefits: (input.benefits || []).map((value) => value.trim()).filter(Boolean),
    sourceText: cleanText(input.sourceText),
    sourceType: input.sourceType,
    sourceUrl: cleanText(input.sourceUrl),
    documentName: cleanText(input.documentName),
  };
}

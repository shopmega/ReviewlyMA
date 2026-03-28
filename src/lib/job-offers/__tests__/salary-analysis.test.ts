import { describe, expect, it } from 'vitest';
import { normalizeJobOfferInput } from '../normalization';
import { computeJobOfferAnalysis } from '../scoring';
import { hasUsableSalary, normalizeSalaryRange, sanitizeSalaryValue } from '../salary';
import type { JobOfferBenchmarks } from '../benchmarks';

const baseBenchmarks: JobOfferBenchmarks = {
  businessId: null,
  companyMatch: {
    businessId: null,
    confidence: 'none',
    method: 'none',
    normalizedCompanySlug: '',
    candidates: [],
  },
  roleCity: null,
  company: null,
  city: null,
  primaryMedianMonthly: null,
  primarySource: 'none',
  sampleCount: 0,
};

describe('job offer salary handling', () => {
  it('sanitizes non-positive salaries to null', () => {
    expect(sanitizeSalaryValue(0)).toBeNull();
    expect(sanitizeSalaryValue(-100)).toBeNull();
    expect(normalizeSalaryRange(0, 0)).toEqual({ salaryMin: null, salaryMax: null });
    expect(hasUsableSalary(0, 0)).toBe(false);
  });

  it('treats 0/0 extraction output as missing salary during normalization', () => {
    const normalized = normalizeJobOfferInput({
      sourceType: 'url',
      sourceUrl: 'https://example.com/job',
      documentName: '',
      companyName: 'Groupe VILAVI',
      jobTitle: 'Gestionnaire de paie et Administration du personnel (ADP)',
      city: 'Tanger',
      salaryMin: 0,
      salaryMax: 0,
      payPeriod: 'monthly',
      contractType: 'cdi',
      workModel: 'onsite',
      seniorityLevel: 'mid',
      yearsExperienceRequired: 5,
      benefits: ['Mutuelle'],
      sourceText: 'Offre sans salaire visible',
    });

    expect(normalized.salaryMin).toBeNull();
    expect(normalized.salaryMax).toBeNull();
    expect(normalized.salaryMinMonthly).toBeNull();
    expect(normalized.salaryMaxMonthly).toBeNull();
    expect(normalized.midpointMonthly).toBeNull();
  });

  it('marks missing salary when input salary values are zeroed out', () => {
    const normalized = normalizeJobOfferInput({
      sourceType: 'url',
      sourceUrl: 'https://example.com/job',
      documentName: '',
      companyName: 'Groupe VILAVI',
      jobTitle: 'Gestionnaire de paie et Administration du personnel (ADP)',
      city: 'Tanger',
      salaryMin: 0,
      salaryMax: 0,
      payPeriod: 'monthly',
      contractType: 'cdi',
      workModel: 'onsite',
      seniorityLevel: 'mid',
      yearsExperienceRequired: 5,
      benefits: ['Mutuelle Axa', 'Prime panier'],
      sourceText: 'Offre sans salaire visible',
    });

    const analysis = computeJobOfferAnalysis(normalized, {
      ...baseBenchmarks,
      primaryMedianMonthly: 9000,
      primarySource: 'city',
      sampleCount: 12,
    });

    expect(analysis.market_position_label).toBe('insufficient_data');
    expect(analysis.risk_flags).toContain('missing_salary');
    expect(analysis.missing_information).toContain('Compensation is not disclosed.');
    expect(analysis.confidence_level).toBe('low');
  });

  it('computes market delta without requiring it to be persisted in the database payload', () => {
    const normalized = normalizeJobOfferInput({
      sourceType: 'url',
      sourceUrl: 'https://example.com/job',
      documentName: '',
      companyName: 'Atlas Tech',
      jobTitle: 'Software Engineer',
      city: 'Casablanca',
      salaryMin: 12000,
      salaryMax: 14000,
      payPeriod: 'monthly',
      contractType: 'cdi',
      workModel: 'hybrid',
      seniorityLevel: 'mid',
      yearsExperienceRequired: 3,
      benefits: ['Health insurance'],
      sourceText: 'Software Engineer role in Casablanca with a salary range.',
    });

    const analysis = computeJobOfferAnalysis(normalized, {
      ...baseBenchmarks,
      primaryMedianMonthly: 10000,
      primarySource: 'role_city',
      sampleCount: 18,
    });

    expect(analysis.market_delta_percent).toBe(30);
  });
});

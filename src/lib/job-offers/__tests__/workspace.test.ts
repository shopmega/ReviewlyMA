import { describe, expect, it } from 'vitest';
import type { JobOfferAnalysisRecord, JobOfferEmployerContext, JobOfferRecord } from '@/lib/types';
import {
  buildEmployerSignalContext,
  calculateSimilarOfferSimilarityScore,
  createJobOfferDecisionWorkspace,
} from '../workspace';

const baseAnalysis: Omit<JobOfferAnalysisRecord, 'id' | 'job_offer_id' | 'created_at'> = {
  analysis_version: 'v2',
  overall_offer_score: 72,
  compensation_score: 70,
  market_alignment_score: 68,
  transparency_score: 74,
  quality_score: 75,
  market_position_label: 'fair_market',
  confidence_level: 'medium',
  benchmark_role_city_median: 12000,
  benchmark_company_median: null,
  benchmark_city_median: 11800,
  benchmark_primary_source: 'role_city',
  risk_flags: [],
  missing_information: [],
  strengths: ['The offer has a readable structure.'],
  analysis_summary: 'Balanced read.',
};

const baseOffer: JobOfferRecord = {
  id: 'offer-1',
  user_id: 'user-1',
  business_id: 'business-1',
  company_name: 'Atlas Tech',
  job_title: 'Senior Product Designer',
  job_title_normalized: 'senior-product-designer',
  city: 'Casablanca',
  city_slug: 'casablanca',
  salary_min: 14000,
  salary_max: 18000,
  salary_currency: 'MAD',
  pay_period: 'monthly',
  contract_type: 'cdi',
  work_model: 'hybrid',
  seniority_level: 'senior',
  years_experience_required: 5,
  benefits: ['Health insurance'],
  source_text: 'Structured job offer text',
  source_type: 'paste',
  source_url: null,
  document_name: null,
  company_match_confidence: 'high',
  company_match_method: 'scored',
  company_match_candidates: [],
  status: 'pending',
  visibility: 'private',
  submitted_at: '2026-03-23T00:00:00.000Z',
  approved_at: null,
  rejected_at: null,
  created_at: '2026-03-23T00:00:00.000Z',
  updated_at: '2026-03-23T00:00:00.000Z',
};

function buildEmployerContext(overrides: Partial<JobOfferEmployerContext> = {}): JobOfferEmployerContext {
  return {
    business_id: 'business-1',
    business_name: 'Atlas Tech',
    business_slug: 'atlas-tech',
    overall_rating: 4.2,
    review_count: 18,
    is_claimed: true,
    verification_badge_level: 'verified',
    company_size: '201-500',
    salary_median_monthly: 16000,
    salary_submission_count: 7,
    mapping_confidence: 'high',
    availability: 'full',
    signal_label: 'strong',
    signal_summary: 'Strong employer context.',
    ...overrides,
  };
}

describe('job offer workspace helpers', () => {
  it('builds a strong employer signal when reviews, rating, and verification are solid', () => {
    expect(buildEmployerSignalContext({
      overallRating: 4.3,
      reviewCount: 30,
      verificationBadgeLevel: 'verified',
      salarySubmissionCount: 6,
    })).toEqual({
      signal_label: 'strong',
      signal_summary: 'jobOffers.workspace.employerSignal.strong',
    });
  });

  it('scores similar offers using city, seniority, work model, and contract', () => {
    expect(calculateSimilarOfferSimilarityScore({
      citySlug: 'casablanca',
      targetCitySlug: 'casablanca',
      seniorityLevel: 'senior',
      targetSeniorityLevel: 'senior',
      workModel: 'hybrid',
      targetWorkModel: 'hybrid',
      contractType: 'cdi',
      targetContractType: 'cdi',
    })).toBe(80);
  });

  it('prioritizes asking for salary when pay is missing', () => {
    const workspace = createJobOfferDecisionWorkspace({
      analysis: {
        ...baseAnalysis,
        market_position_label: 'insufficient_data',
      },
      offer: {
        ...baseOffer,
        salary_min: null,
        salary_max: null,
      },
      employerContext: buildEmployerContext({
        signal_label: 'mixed',
      }),
      similarOffers: [],
    });

    expect(workspace.primaryAction?.id).toBe('ask_salary_before_continuing');
  });

  it('suppresses review-aware interpretation when employer context is not full', () => {
    const workspace = createJobOfferDecisionWorkspace({
      analysis: baseAnalysis,
      offer: {
        ...baseOffer,
        company_match_confidence: 'medium',
      },
      employerContext: buildEmployerContext({
        availability: 'limited',
        mapping_confidence: 'medium',
      }),
      similarOffers: [],
    });

    expect(workspace.reviewAwareSignal).toBeNull();
  });

  it('shows a warning banner when employer rating is weak but the offer otherwise looks usable', () => {
    const workspace = createJobOfferDecisionWorkspace({
      analysis: {
        ...baseAnalysis,
        overall_offer_score: 66,
      },
      offer: baseOffer,
      employerContext: buildEmployerContext({
        overall_rating: 3.0,
        review_count: 12,
        signal_label: 'mixed',
      }),
      similarOffers: [],
    });

    expect(workspace.reviewAwareSignal?.title).toBe('jobOffers.workspace.signals.reviewAware.weakReputation.title');
  });
});

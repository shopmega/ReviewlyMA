import { describe, expect, it } from 'vitest';
import type { MyJobOfferAnalysisListItem } from '@/lib/data/job-offers';
import { buildComparisonSummary, filterJobOfferAnalyses } from '../history';

const analyses: MyJobOfferAnalysisListItem[] = [
  {
    id: 'a1',
    job_offer_id: 'o1',
    analysis_version: 'v1',
    overall_offer_score: 82,
    compensation_score: 78,
    market_alignment_score: 70,
    transparency_score: 90,
    quality_score: 80,
    market_position_label: 'above_market',
    confidence_level: 'high',
    benchmark_role_city_median: null,
    benchmark_company_median: null,
    benchmark_city_median: 10000,
    benchmark_primary_source: 'city',
    risk_flags: [],
    missing_information: [],
    strengths: [],
    analysis_summary: 'summary',
    created_at: '2026-03-20T00:00:00Z',
    job_offers: {
      id: 'o1',
      company_name: 'ADM Value (Maroc)',
      job_title: 'Gestionnaire de paie',
      city: 'Rabat',
      source_type: 'url',
      submitted_at: '2026-03-20T00:00:00Z',
    },
  },
  {
    id: 'a2',
    job_offer_id: 'o2',
    analysis_version: 'v1',
    overall_offer_score: 41,
    compensation_score: 40,
    market_alignment_score: 45,
    transparency_score: 55,
    quality_score: 52,
    market_position_label: 'below_market',
    confidence_level: 'medium',
    benchmark_role_city_median: null,
    benchmark_company_median: null,
    benchmark_city_median: 9000,
    benchmark_primary_source: 'city',
    risk_flags: [],
    missing_information: [],
    strengths: [],
    analysis_summary: 'summary',
    created_at: '2026-03-21T00:00:00Z',
    job_offers: {
      id: 'o2',
      company_name: 'Intelcia',
      job_title: 'HR Specialist',
      city: 'Casablanca',
      source_type: 'paste',
      submitted_at: '2026-03-21T00:00:00Z',
    },
  },
];

describe('job offer history helpers', () => {
  it('filters analyses by query and verdict', () => {
    const filtered = filterJobOfferAnalyses(analyses, {
      query: 'adm',
      verdict: 'above_market',
      confidence: 'all',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('a1');
  });

  it('summarizes comparison highlights', () => {
    const summary = buildComparisonSummary(analyses);

    expect(summary.bestScoreId).toBe('a1');
    expect(summary.clearestId).toBe('a1');
    expect(summary.strongestConfidenceCount).toBe(1);
  });
});

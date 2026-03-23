import type { MyJobOfferAnalysisListItem } from '@/lib/data/job-offers';

export type JobOfferHistoryFilters = {
  query: string;
  verdict: 'all' | 'insufficient_data' | 'below_market' | 'fair_market' | 'above_market' | 'strong_offer';
  confidence: 'all' | 'low' | 'medium' | 'high';
};

export function filterJobOfferAnalyses(
  analyses: MyJobOfferAnalysisListItem[],
  filters: JobOfferHistoryFilters
) {
  const query = filters.query.trim().toLowerCase();

  return analyses.filter((item) => {
    const matchesQuery = !query || [
      item.job_offers.company_name,
      item.job_offers.job_title,
      item.job_offers.city || '',
    ].some((value) => value.toLowerCase().includes(query));

    const matchesVerdict = filters.verdict === 'all' || item.market_position_label === filters.verdict;
    const matchesConfidence = filters.confidence === 'all' || item.confidence_level === filters.confidence;

    return matchesQuery && matchesVerdict && matchesConfidence;
  });
}

export function buildComparisonSummary(analyses: MyJobOfferAnalysisListItem[]) {
  if (analyses.length === 0) {
    return {
      bestScoreId: null,
      clearestId: null,
      strongestConfidenceCount: 0,
    };
  }

  const bestScore = analyses.reduce((best, current) =>
    current.overall_offer_score > best.overall_offer_score ? current : best
  );
  const clearest = analyses.reduce((best, current) =>
    current.transparency_score > best.transparency_score ? current : best
  );
  const strongestConfidenceCount = analyses.filter((item) => item.confidence_level === 'high').length;

  return {
    bestScoreId: bestScore.id,
    clearestId: clearest.id,
    strongestConfidenceCount,
  };
}

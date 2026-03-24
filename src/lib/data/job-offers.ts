import type {
  JobOfferAnalysisRecord,
  JobOfferDecisionWorkspace,
  JobOfferEmployerContext,
  JobOfferBusinessInsights,
  JobOfferBusinessMonthlyTrend,
  JobOfferCompanyMetrics,
  JobOfferRecord,
  JobOfferRoleCityMetrics,
  JobOfferSimilarOffer,
} from '@/lib/types';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPublicClient } from './client';
import {
  buildEmployerSignalContext,
  buildRoleCitySalaryHref,
  buildSimilarOfferLabel,
  calculateSimilarOfferSimilarityScore,
  createJobOfferDecisionWorkspace,
} from '@/lib/job-offers/workspace';

export type MyJobOfferAnalysisListItem = JobOfferAnalysisRecord & {
  job_offers: Pick<JobOfferRecord, 'id' | 'company_name' | 'job_title' | 'city' | 'source_type' | 'submitted_at'>;
};

async function getAnalyticsClient() {
  try {
    return await createServiceClient();
  } catch {
    return getPublicClient();
  }
}

export async function getJobOfferAnalysisById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('job_offer_analyses')
    .select(`
      *,
      job_offers!inner (
        *
      )
    `)
    .eq('id', id)
    .eq('job_offers.user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    analysis: data as JobOfferAnalysisRecord,
    offer: (data as any).job_offers as JobOfferRecord,
  };
}

export async function getJobOfferDecisionWorkspace(id: string): Promise<JobOfferDecisionWorkspace | null> {
  const record = await getJobOfferAnalysisById(id);
  if (!record) return null;

  const [employerContext, similarOffers] = await Promise.all([
    getJobOfferEmployerContext(record.offer),
    getSimilarJobOfferAnalyses({
      currentOfferId: record.offer.id,
      jobTitleNormalized: record.offer.job_title_normalized,
      jobTitle: record.offer.job_title,
      citySlug: record.offer.city_slug,
      seniorityLevel: record.offer.seniority_level,
      workModel: record.offer.work_model,
      contractType: record.offer.contract_type,
      limit: 4,
    }),
  ]);

  return createJobOfferDecisionWorkspace({
    analysis: {
      analysis_version: record.analysis.analysis_version,
      overall_offer_score: record.analysis.overall_offer_score,
      compensation_score: record.analysis.compensation_score,
      market_alignment_score: record.analysis.market_alignment_score,
      transparency_score: record.analysis.transparency_score,
      quality_score: record.analysis.quality_score,
      market_position_label: record.analysis.market_position_label,
      confidence_level: record.analysis.confidence_level,
      benchmark_role_city_median: record.analysis.benchmark_role_city_median,
      benchmark_company_median: record.analysis.benchmark_company_median,
      benchmark_city_median: record.analysis.benchmark_city_median,
      benchmark_primary_source: record.analysis.benchmark_primary_source,
      risk_flags: record.analysis.risk_flags,
      missing_information: record.analysis.missing_information,
      strengths: record.analysis.strengths,
      analysis_summary: record.analysis.analysis_summary,
    },
    offer: record.offer,
    employerContext,
    similarOffers,
  });
}

export async function getJobOfferEmployerContext(
  offer: Pick<JobOfferRecord, 'business_id' | 'company_match_confidence' | 'company_name'>
): Promise<JobOfferEmployerContext | null> {
  const mappingConfidence = offer.company_match_confidence || 'none';
  if (!offer.business_id || mappingConfidence === 'low' || mappingConfidence === 'none') {
    return {
      business_id: offer.business_id || null,
      business_name: offer.company_name || 'Unknown company',
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

  const supabase = await getAnalyticsClient();
  const [{ data: business }, { data: salaryMetrics }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, slug, name, overall_rating, review_count, verification_badge_level, company_size, owner_id, user_id')
      .eq('id', offer.business_id)
      .maybeSingle(),
    supabase
      .from('salary_company_metrics')
      .select('median_monthly_salary, submission_count')
      .eq('business_id', offer.business_id)
      .maybeSingle(),
  ]);

  if (!business) {
    return {
      business_id: offer.business_id || null,
      business_name: offer.company_name || 'Unknown company',
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
      signal_summary: 'Employer context is unavailable because the mapped business could not be resolved cleanly.',
    };
  }

  const signal = buildEmployerSignalContext({
    overallRating: business.overall_rating ?? null,
    reviewCount: Number(business.review_count || 0),
    verificationBadgeLevel: business.verification_badge_level ?? null,
    salarySubmissionCount: Number((salaryMetrics as any)?.submission_count || 0),
  });

  return {
    business_id: business.id,
    business_name: business.name || business.id,
    business_slug: business.slug || business.id,
    overall_rating: business.overall_rating ?? null,
    review_count: Number(business.review_count || 0),
    is_claimed: Boolean((business as any).owner_id || (business as any).user_id),
    verification_badge_level: business.verification_badge_level ?? null,
    company_size: business.company_size ?? null,
    salary_median_monthly: (salaryMetrics as any)?.median_monthly_salary ?? null,
    salary_submission_count: Number((salaryMetrics as any)?.submission_count || 0),
    mapping_confidence: mappingConfidence,
    availability: mappingConfidence === 'high' ? 'full' : 'limited',
    signal_label: signal.signal_label,
    signal_summary: mappingConfidence === 'high'
      ? signal.signal_summary
      : 'This employer match is plausible, but the mapping is not strong enough to support strong public claims or outbound links yet.',
  };
}

export async function getSimilarJobOfferAnalyses(options: {
  currentOfferId?: string | null;
  jobTitleNormalized?: string | null;
  citySlug?: string | null;
  jobTitle?: string | null;
  seniorityLevel?: string | null;
  workModel?: string | null;
  contractType?: string | null;
  limit?: number;
}): Promise<JobOfferSimilarOffer[]> {
  if (!options.jobTitleNormalized) return [];

  const limit = Math.max(3, Math.min(options.limit || 4, 5));
  const supabase = await getAnalyticsClient();

  const buildQuery = (matchCity: boolean) => {
    let query = supabase
      .from('job_offer_analyses')
      .select(`
        id,
        overall_offer_score,
        market_position_label,
        confidence_level,
        job_offers!inner (
          id,
          business_id,
          company_name,
          job_title,
          city,
          city_slug,
          salary_min,
          salary_max,
          pay_period,
          work_model,
          contract_type,
          seniority_level,
          visibility,
          job_title_normalized,
          status
        )
      `)
      .eq('job_offers.status', 'approved')
      .in('job_offers.visibility', ['aggregate_only', 'public'])
      .eq('job_offers.job_title_normalized', options.jobTitleNormalized)
      .limit(limit + 6);

    if (matchCity && options.citySlug) {
      query = query.eq('job_offers.city_slug', options.citySlug);
    }

    if (options.currentOfferId) {
      query = query.neq('job_offers.id', options.currentOfferId);
    }

    return query;
  };

  const primary = await buildQuery(true);
  const fallback = (!primary.error && (primary.data?.length || 0) >= 3) || !options.citySlug
    ? { data: [], error: null }
    : await buildQuery(false);

  const combinedRows = [...(primary.data || []), ...(fallback.data || [])] as Array<any>;
  const dedupedRows = combinedRows.filter((row, index, array) => array.findIndex((item) => item.id === row.id) === index);
  const rows = dedupedRows;
  if (!rows.length) return [];

  const businessIds = Array.from(new Set(rows.map((row) => row.job_offers?.business_id).filter(Boolean))) as string[];
  const { data: businesses } = businessIds.length === 0
    ? { data: [] as Array<{ id: string; slug: string | null }> }
    : await supabase
      .from('businesses')
      .select('id, slug')
      .in('id', businessIds);
  const businessSlugMap = new Map<string, string | null>((businesses || []).map((business: { id: string; slug: string | null }) => [business.id, business.slug || null]));

  const scored = rows
    .map((row) => {
      const offer = row.job_offers;
      const similarityScore = calculateSimilarOfferSimilarityScore({
        citySlug: offer.city_slug,
        targetCitySlug: options.citySlug,
        seniorityLevel: offer.seniority_level,
        targetSeniorityLevel: options.seniorityLevel,
        workModel: offer.work_model,
        targetWorkModel: options.workModel,
        contractType: offer.contract_type,
        targetContractType: options.contractType,
      });
      const businessSlug = offer.business_id ? businessSlugMap.get(offer.business_id) || null : null;
      const salaryHref = buildRoleCitySalaryHref(offer.job_title || options.jobTitle || null, offer.city_slug || null);
      const publicHref = businessSlug ? `/businesses/${businessSlug}` : salaryHref;

      return {
        analysis_id: row.id,
        job_offer_id: offer.id,
        business_id: offer.business_id,
        business_slug: businessSlug,
        company_name: offer.company_name,
        job_title: offer.job_title,
        city: offer.city,
        city_slug: offer.city_slug,
        salary_min: offer.salary_min,
        salary_max: offer.salary_max,
        pay_period: offer.pay_period,
        work_model: offer.work_model,
        contract_type: offer.contract_type,
        seniority_level: offer.seniority_level,
        overall_offer_score: Number(row.overall_offer_score || 0),
        market_position_label: row.market_position_label,
        confidence_level: row.confidence_level,
        public_href: publicHref,
        similarity_score: similarityScore,
      };
    })
    .filter((row) => row.similarity_score >= 30)
    .sort((left, right) => right.similarity_score - left.similarity_score || right.overall_offer_score - left.overall_offer_score)
    .slice(0, limit);

  return scored.map((row) => ({
    analysis_id: row.analysis_id,
    job_offer_id: row.job_offer_id,
    business_id: row.business_id,
    business_slug: row.business_slug,
    company_name: row.company_name,
    job_title: row.job_title,
    city: row.city,
    city_slug: row.city_slug,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    pay_period: row.pay_period,
    work_model: row.work_model,
    contract_type: row.contract_type,
    seniority_level: row.seniority_level,
    overall_offer_score: row.overall_offer_score,
    market_position_label: row.market_position_label,
    confidence_level: row.confidence_level,
    public_href: row.public_href,
    similarity_score: row.similarity_score,
    similarity_label: buildSimilarOfferLabel({
      overallOfferScore: row.overall_offer_score,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
    }),
  }));
}

export async function getMyJobOfferAnalyses(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('job_offer_analyses')
    .select(`
      *,
      job_offers!inner (
        id,
        company_name,
        job_title,
        city,
        source_type,
        submitted_at
      )
    `)
    .eq('job_offers.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as MyJobOfferAnalysisListItem[];
}

export async function getJobOfferCompanyMetrics(companySlug: string): Promise<JobOfferCompanyMetrics | null> {
  const supabase = await getAnalyticsClient();
  const { data, error } = await supabase
    .from('job_offer_company_metrics')
    .select('*')
    .eq('business_id', companySlug)
    .maybeSingle();

  if (error || !data) return null;
  return data as JobOfferCompanyMetrics;
}

export async function getBusinessJobOfferInsights(businessId: string): Promise<JobOfferBusinessInsights | null> {
  const supabase = await getAnalyticsClient();
  const { data, error } = await supabase
    .from('job_offer_business_insights')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error || !data) return null;
  return data as JobOfferBusinessInsights;
}

export async function getBusinessJobOfferMonthlyTrends(businessId: string): Promise<JobOfferBusinessMonthlyTrend[]> {
  const supabase = await getAnalyticsClient();
  const { data, error } = await supabase
    .from('job_offer_business_monthly_trends')
    .select('*')
    .eq('business_id', businessId)
    .order('month_date', { ascending: true });

  if (error || !data) return [];
  return data as JobOfferBusinessMonthlyTrend[];
}

export async function getJobOfferRoleCityMetrics(roleSlug: string, citySlug: string): Promise<JobOfferRoleCityMetrics | null> {
  const supabase = await getAnalyticsClient();
  const { data, error } = await supabase
    .from('job_offer_role_city_metrics')
    .select('*')
    .eq('job_title_normalized', roleSlug)
    .eq('city_slug', citySlug)
    .maybeSingle();

  if (error || !data) return null;
  return data as JobOfferRoleCityMetrics;
}

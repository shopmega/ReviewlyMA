import type {
  JobOfferAnalysisRecord,
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

export type MyJobOfferAnalysisListItem = JobOfferAnalysisRecord & {
  job_offers: Pick<JobOfferRecord, 'id' | 'company_name' | 'job_title' | 'city' | 'source_type' | 'submitted_at'>;
};

function buildEmployerSignalContext(options: {
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

function buildSimilarOfferLabel(options: {
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

export async function getJobOfferEmployerContext(
  offer: Pick<JobOfferRecord, 'business_id' | 'company_match_confidence'>
): Promise<JobOfferEmployerContext | null> {
  if (!offer.business_id || offer.company_match_confidence !== 'high') return null;

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

  if (!business) return null;

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
    signal_label: signal.signal_label,
    signal_summary: signal.signal_summary,
  };
}

export async function getSimilarJobOfferAnalyses(options: {
  currentOfferId?: string | null;
  jobTitleNormalized?: string | null;
  citySlug?: string | null;
  workModel?: string | null;
  contractType?: string | null;
  limit?: number;
}): Promise<JobOfferSimilarOffer[]> {
  if (!options.jobTitleNormalized) return [];

  const limit = Math.max(1, Math.min(options.limit || 4, 8));
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
          job_title_normalized,
          status
        )
      `)
      .eq('job_offers.status', 'approved')
      .eq('job_offers.job_title_normalized', options.jobTitleNormalized)
      .limit(limit + 2);

    if (matchCity && options.citySlug) {
      query = query.eq('job_offers.city_slug', options.citySlug);
    }

    if (options.currentOfferId) {
      query = query.neq('job_offers.id', options.currentOfferId);
    }

    return query;
  };

  const primary = await buildQuery(true);
  const fallback = (!primary.error && (primary.data?.length || 0) >= limit) || !options.citySlug
    ? { data: [], error: null }
    : await buildQuery(false);

  const rows = ((primary.data?.length || 0) > 0 ? primary.data : fallback.data || []) as Array<any>;
  if (!rows.length) return [];

  const scored = rows
    .map((row) => {
      const offer = row.job_offers;
      let similarityScore = 0;
      if (offer.city_slug && options.citySlug && offer.city_slug === options.citySlug) similarityScore += 30;
      if (offer.work_model && options.workModel && offer.work_model === options.workModel) similarityScore += 20;
      if (offer.contract_type && options.contractType && offer.contract_type === options.contractType) similarityScore += 15;

      return {
        analysis_id: row.id,
        job_offer_id: offer.id,
        business_id: offer.business_id,
        company_name: offer.company_name,
        job_title: offer.job_title,
        city: offer.city,
        salary_min: offer.salary_min,
        salary_max: offer.salary_max,
        pay_period: offer.pay_period,
        work_model: offer.work_model,
        contract_type: offer.contract_type,
        overall_offer_score: Number(row.overall_offer_score || 0),
        market_position_label: row.market_position_label,
        confidence_level: row.confidence_level,
        similarityScore,
      };
    })
    .sort((left, right) => right.similarityScore - left.similarityScore || right.overall_offer_score - left.overall_offer_score)
    .slice(0, limit);

  return scored.map((row) => ({
    analysis_id: row.analysis_id,
    job_offer_id: row.job_offer_id,
    business_id: row.business_id,
    company_name: row.company_name,
    job_title: row.job_title,
    city: row.city,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    pay_period: row.pay_period,
    work_model: row.work_model,
    contract_type: row.contract_type,
    overall_offer_score: row.overall_offer_score,
    market_position_label: row.market_position_label,
    confidence_level: row.confidence_level,
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

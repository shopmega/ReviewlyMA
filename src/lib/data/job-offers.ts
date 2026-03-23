import type {
  JobOfferAnalysisRecord,
  JobOfferBusinessInsights,
  JobOfferBusinessMonthlyTrend,
  JobOfferCompanyMetrics,
  JobOfferRecord,
  JobOfferRoleCityMetrics,
} from '@/lib/types';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPublicClient } from './client';

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

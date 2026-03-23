import type { SalaryCityMetrics, SalaryCompanyMetrics, SalaryRoleCityMetrics } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/server';
import { getPublicClient } from '@/lib/data/client';
import type { NormalizedJobOfferInput } from './normalization';
import type { BusinessMatchResult } from './company-match';
import { resolveBusinessMatchForCompany } from './business-resolution';

type BenchmarksClient = Awaited<ReturnType<typeof getBenchmarksClient>>;

async function getBenchmarksClient() {
  try {
    return await createServiceClient();
  } catch {
    return getPublicClient();
  }
}

async function findBusinessIdByCompanyName(
  client: BenchmarksClient,
  companyName: string,
  options?: {
    sourceUrl?: string | null;
    city?: string | null;
  }
): Promise<BusinessMatchResult> {
  return resolveBusinessMatchForCompany(client as any, companyName, options);
}

export type JobOfferBenchmarks = {
  businessId: string | null;
  companyMatch: BusinessMatchResult;
  roleCity: SalaryRoleCityMetrics | null;
  company: SalaryCompanyMetrics | null;
  city: SalaryCityMetrics | null;
  primaryMedianMonthly: number | null;
  primarySource: 'role_city' | 'company' | 'city' | 'none';
  sampleCount: number;
};

export async function getJobOfferBenchmarks(input: NormalizedJobOfferInput): Promise<JobOfferBenchmarks> {
  const client = await getBenchmarksClient();
  const companyMatch = await findBusinessIdByCompanyName(client, input.companyName, {
    sourceUrl: input.sourceUrl,
    city: input.city,
  });
  const businessId = companyMatch.businessId;

  const [roleCityResult, companyResult, cityResult] = await Promise.all([
    input.jobTitle && input.citySlug
      ? client
          .from('salary_role_city_metrics')
          .select('*')
          .eq('job_title', input.jobTitle)
          .eq('city_slug', input.citySlug)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    businessId
      ? client
          .from('salary_company_metrics')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.citySlug
      ? client
          .from('salary_city_metrics')
          .select('*')
          .eq('city_slug', input.citySlug)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const roleCity = !roleCityResult.error && roleCityResult.data ? roleCityResult.data as SalaryRoleCityMetrics : null;
  const company = !companyResult.error && companyResult.data ? companyResult.data as SalaryCompanyMetrics : null;
  const city = !cityResult.error && cityResult.data ? cityResult.data as SalaryCityMetrics : null;

  const primaryMedianMonthly = roleCity?.median_monthly_salary
    ?? company?.median_monthly_salary
    ?? city?.median_monthly_salary
    ?? null;

  const primarySource = roleCity?.median_monthly_salary != null
    ? 'role_city'
    : company?.median_monthly_salary != null
      ? 'company'
      : city?.median_monthly_salary != null
        ? 'city'
        : 'none';

  const sampleCount = roleCity?.submission_count
    ?? company?.submission_count
    ?? city?.submission_count
    ?? 0;

  return {
    businessId,
    companyMatch,
    roleCity,
    company,
    city,
    primaryMedianMonthly,
    primarySource,
    sampleCount,
  };
}

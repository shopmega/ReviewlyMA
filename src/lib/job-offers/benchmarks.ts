import type { SalaryCityMetrics, SalaryCompanyMetrics, SalaryRoleCityMetrics } from '@/lib/types';
import { createServiceClient } from '@/lib/supabase/server';
import { getPublicClient } from '@/lib/data/client';
import { slugify } from '@/lib/utils';
import type { NormalizedJobOfferInput } from './normalization';

type BenchmarksClient = Awaited<ReturnType<typeof getBenchmarksClient>>;

async function getBenchmarksClient() {
  try {
    return await createServiceClient();
  } catch {
    return getPublicClient();
  }
}

async function findBusinessIdByCompanyName(client: BenchmarksClient, companyName: string): Promise<string | null> {
  if (!companyName) return null;

  const { data, error } = await client
    .from('businesses')
    .select('id, name')
    .ilike('name', `%${companyName}%`)
    .limit(30);

  if (error || !data) return null;

  const exactSlug = slugify(companyName);
  const exactMatch = (data as Array<{ id: string; name: string | null }>).find((row) => row.name && slugify(row.name) === exactSlug);
  return exactMatch?.id ?? (data[0]?.id ?? null);
}

export type JobOfferBenchmarks = {
  businessId: string | null;
  roleCity: SalaryRoleCityMetrics | null;
  company: SalaryCompanyMetrics | null;
  city: SalaryCityMetrics | null;
  primaryMedianMonthly: number | null;
  primarySource: 'role_city' | 'company' | 'city' | 'none';
  sampleCount: number;
};

export async function getJobOfferBenchmarks(input: NormalizedJobOfferInput): Promise<JobOfferBenchmarks> {
  const client = await getBenchmarksClient();
  const businessId = await findBusinessIdByCompanyName(client, input.companyName);

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
    roleCity,
    company,
    city,
    primaryMedianMonthly,
    primarySource,
    sampleCount,
  };
}

'use server';

import type {
  SalaryCityMetrics,
  SalaryCitySectorMetrics,
  SalaryCompanyMetrics,
  SalaryEntry,
  SalaryRoleCityMetrics,
  SalaryStats,
} from '@/lib/types';
import { getPublicClient } from './client';

function toMonthlySalary(value: number, payPeriod: 'monthly' | 'yearly'): number {
  return payPeriod === 'yearly' ? value / 12 : value;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export async function getPublishedSalariesByBusiness(
  businessId: string,
  limit = 20
): Promise<SalaryEntry[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salaries')
    .select(`
      id,
      business_id,
      user_id,
      job_title,
      salary,
      location,
      pay_period,
      currency,
      employment_type,
      years_experience,
      seniority_level,
      department,
      sector_slug,
      work_model,
      bonus_flags,
      salary_monthly_normalized,
      is_current,
      source,
      status,
      moderation_notes,
      reviewed_at,
      reviewed_by,
      created_at
    `)
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as SalaryEntry[];
}

export async function getSalaryStatsByBusiness(businessId: string): Promise<SalaryStats> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salaries')
    .select('job_title, salary, pay_period, currency')
    .eq('business_id', businessId)
    .eq('status', 'published');

  if (error || !data || data.length === 0) {
    return {
      count: 0,
      medianMonthly: null,
      minMonthly: null,
      maxMonthly: null,
      currency: 'MAD',
      roleBreakdown: [],
    };
  }

  type NormalizedRow = {
    jobTitle: string;
    monthlySalary: number;
    currency: string;
  };

  const normalized: NormalizedRow[] = data.map((row: any) => ({
    jobTitle: row.job_title,
    monthlySalary: toMonthlySalary(Number(row.salary), row.pay_period === 'yearly' ? 'yearly' : 'monthly'),
    currency: row.currency || 'MAD',
  }));

  const monthlyValues = normalized.map((row: NormalizedRow) => row.monthlySalary);
  const roleMap = new Map<string, number[]>();

  normalized.forEach((row: NormalizedRow) => {
    if (!roleMap.has(row.jobTitle)) roleMap.set(row.jobTitle, []);
    roleMap.get(row.jobTitle)!.push(row.monthlySalary);
  });

  const roleBreakdown = Array.from(roleMap.entries())
    .map(([jobTitle, values]) => ({
      jobTitle,
      count: values.length,
      medianMonthly: Math.round((median(values) || 0) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count || b.medianMonthly - a.medianMonthly)
    .slice(0, 5);

  return {
    count: normalized.length,
    medianMonthly: Math.round((median(monthlyValues) || 0) * 100) / 100,
    minMonthly: Math.round(Math.min(...monthlyValues) * 100) / 100,
    maxMonthly: Math.round(Math.max(...monthlyValues) * 100) / 100,
    currency: normalized[0]?.currency || 'MAD',
    roleBreakdown,
  };
}

export async function getSalaryCompanyMetricsByBusiness(
  businessId: string
): Promise<SalaryCompanyMetrics | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salary_company_metrics')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SalaryCompanyMetrics;
}

export async function getSalaryCompanyMetricsList(
  limit = 200
): Promise<SalaryCompanyMetrics[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salary_company_metrics')
    .select('*')
    .order('submission_count', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SalaryCompanyMetrics[];
}

export async function getSalaryCitySectorMetrics(
  options?: {
    citySlug?: string;
    sectorSlug?: string;
    limit?: number;
  }
): Promise<SalaryCitySectorMetrics[]> {
  const supabase = getPublicClient();
  let query = supabase
    .from('salary_city_sector_metrics')
    .select('*')
    .order('submission_count', { ascending: false });

  if (options?.citySlug) {
    query = query.eq('city_slug', options.citySlug);
  }

  if (options?.sectorSlug) {
    query = query.eq('sector_slug', options.sectorSlug);
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SalaryCitySectorMetrics[];
}

export async function getSalaryCityMetrics(
  citySlug?: string
): Promise<SalaryCityMetrics[]> {
  const supabase = getPublicClient();
  let query = supabase
    .from('salary_city_metrics')
    .select('*')
    .order('submission_count', { ascending: false });

  if (citySlug) {
    query = query.eq('city_slug', citySlug);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SalaryCityMetrics[];
}

export async function getSalaryRoleCityMetrics(
  options?: {
    citySlug?: string;
    jobTitle?: string;
    limit?: number;
  }
): Promise<SalaryRoleCityMetrics[]> {
  const supabase = getPublicClient();
  let query = supabase
    .from('salary_role_city_metrics')
    .select('*')
    .order('submission_count', { ascending: false });

  if (options?.citySlug) {
    query = query.eq('city_slug', options.citySlug);
  }

  if (options?.jobTitle) {
    query = query.ilike('job_title', `%${options.jobTitle}%`);
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SalaryRoleCityMetrics[];
}

export async function getSalaryRoleCityMetric(
  jobTitle: string,
  citySlug: string
): Promise<SalaryRoleCityMetrics | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salary_role_city_metrics')
    .select('*')
    .eq('job_title', jobTitle)
    .eq('city_slug', citySlug)
    .maybeSingle();

  if (error || !data) return null;
  return data as SalaryRoleCityMetrics;
}

export async function getTopSalaryRoleCityPairs(
  limit = 50
): Promise<SalaryRoleCityMetrics[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salary_role_city_metrics')
    .select('*')
    .order('submission_count', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SalaryRoleCityMetrics[];
}

export async function getTopSalarySectorCityPairs(
  limit = 50
): Promise<SalaryCitySectorMetrics[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('salary_city_sector_metrics')
    .select('*')
    .order('submission_count', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as SalaryCitySectorMetrics[];
}

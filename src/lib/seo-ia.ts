/**
 * SEO IA rollout thresholds and indexing guards.
 * Keep transitional routes non-indexable until legacy route cutover is complete.
 */
export const MIN_INDEXABLE_REFERRAL_DEMAND_ROLE_CITY_LISTINGS = 4;
export const MIN_INDEXABLE_COMPANY_REFERRAL_OFFERS = 3;
export const MIN_INDEXABLE_SALARY_ROLE_CITY_SAMPLES = 8;
export const MIN_INDEXABLE_MONTHLY_REPORT_RECORDS = 10;

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
  return fallback;
}

// Indexing toggles
export const ENABLE_COMPANY_ROUTE_INDEXING = readBooleanEnv('NEXT_PUBLIC_ENABLE_COMPANY_ROUTE_INDEXING', false);
export const ENABLE_SALARY_ROUTE_INDEXING = readBooleanEnv('NEXT_PUBLIC_ENABLE_SALARY_ROUTE_INDEXING', false);
export const ENABLE_REPORTS_HUB_INDEXING = readBooleanEnv('NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING', false);
export const ENABLE_BLOG_HUB_INDEXING = readBooleanEnv('NEXT_PUBLIC_ENABLE_BLOG_HUB_INDEXING', true);

// Canonical cutover toggles
export const PREFER_NEW_COMPANY_ROUTE_CANONICAL = readBooleanEnv('NEXT_PUBLIC_PREFER_NEW_COMPANY_ROUTE_CANONICAL', false);
export const PREFER_NEW_SALARY_ROUTE_CANONICAL = readBooleanEnv('NEXT_PUBLIC_PREFER_NEW_SALARY_ROUTE_CANONICAL', false);

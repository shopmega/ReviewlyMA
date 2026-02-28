import { createClient } from '@/lib/supabase/server';
import type { Ad } from '@/lib/types';

export type AdPlacement =
  | 'home_top_banner'
  | 'directory_top_banner'
  | 'directory_inline'
  | 'business_profile_inline'
  | 'business_profile_sidebar'
  | 'referrals_top_banner'
  | 'referrals_inline'
  | 'referrals_detail_sidebar'
  | 'salary_page_top_banner'
  | 'salary_page_inline'
  | 'salary_compare_top_banner'
  | 'salary_role_city_inline'
  | 'salary_sector_city_inline'
  | 'salary_share_top_banner';

export type AdDeliveryContext = {
  businessId?: string;
  citySlug?: string;
  roleSlug?: string;
  sectorSlug?: string;
};

type AdTargetingCriteria = {
  placements?: string[];
  salary?: {
    citySlugs?: string[];
    roleSlugs?: string[];
    sectorSlugs?: string[];
  };
  cta_url?: string;
  cta_label?: string;
};

function isActiveNow(ad: Ad, now: Date): boolean {
  if (ad.status !== 'active') return false;
  const start = ad.start_date ? new Date(ad.start_date) : null;
  const end = ad.end_date ? new Date(ad.end_date) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function matchesPlacement(ad: Ad, placement: AdPlacement): boolean {
  const criteria = (ad.targeting_criteria || {}) as AdTargetingCriteria;
  const placements = Array.isArray(criteria.placements) ? criteria.placements : [];
  if (placements.length === 0) return true;
  return placements.includes(placement);
}

function matchesContext(ad: Ad, context: AdDeliveryContext): boolean {
  const criteria = (ad.targeting_criteria || {}) as AdTargetingCriteria;
  const salary = criteria.salary;
  if (!salary) return true;

  if (context.citySlug && Array.isArray(salary.citySlugs) && salary.citySlugs.length > 0) {
    if (!salary.citySlugs.includes(context.citySlug)) return false;
  }

  if (context.roleSlug && Array.isArray(salary.roleSlugs) && salary.roleSlugs.length > 0) {
    if (!salary.roleSlugs.includes(context.roleSlug)) return false;
  }

  if (context.sectorSlug && Array.isArray(salary.sectorSlugs) && salary.sectorSlugs.length > 0) {
    if (!salary.sectorSlugs.includes(context.sectorSlug)) return false;
  }

  if (context.businessId && Array.isArray(ad.target_business_ids) && ad.target_business_ids.length > 0) {
    if (!ad.target_business_ids.includes(context.businessId)) return false;
  }

  return true;
}

export async function getAdsForPlacement(
  placement: AdPlacement,
  context: AdDeliveryContext = {},
  limit = 3
): Promise<Ad[]> {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(120);

  if (error || !Array.isArray(data)) {
    return [];
  }

  const rows = data as Ad[];
  return rows
    .filter((ad) => isActiveNow(ad, now))
    .filter((ad) => matchesPlacement(ad, placement))
    .filter((ad) => matchesContext(ad, context))
    .slice(0, limit);
}

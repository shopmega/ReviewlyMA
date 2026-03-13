'use server';

import { slugify } from '@/lib/utils';
import type { ReferralDemandSummary, ReferralOfferSummary } from '@/lib/types';
import { getPublicClient } from './client';
import { getBusinessById } from './businesses';

type BusinessReferralActivity = {
  offers: ReferralOfferSummary[];
  demands: ReferralDemandSummary[];
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export async function findBusinessRouteByCompanySlug(companySlug: string): Promise<string | null> {
  const directBusiness = await getBusinessById(companySlug);
  if (directBusiness) {
    return directBusiness.id;
  }

  const keyword = normalizeText(companySlug.replace(/-/g, ' '));
  if (!keyword) return null;

  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name')
    .ilike('name', `%${keyword}%`)
    .limit(40);

  if (error || !data) {
    return null;
  }

  const match = (data as Array<{ id: string; name: string | null }>).find((row) => {
    if (!row.name) return false;
    return slugify(row.name) === companySlug;
  });

  return match?.id || null;
}

export async function getBusinessReferralActivity({
  businessId,
  businessName,
  offerLimit = 6,
  demandLimit = 4,
}: {
  businessId: string;
  businessName: string;
  offerLimit?: number;
  demandLimit?: number;
}): Promise<BusinessReferralActivity> {
  const supabase = getPublicClient();
  const normalizedName = normalizeText(businessName);

  const offersPromise = supabase
    .from('job_referral_offers')
    .select('id, business_id, company_name, job_title, city, slots, created_at')
    .eq('status', 'active')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(offerLimit);

  const demandsPromise = normalizedName
    ? supabase
      .from('job_referral_demand_listings')
      .select('id, title, target_role, city, summary, created_at')
      .eq('status', 'active')
      .or(`title.ilike.%${normalizedName}%,summary.ilike.%${normalizedName}%,details.ilike.%${normalizedName}%`)
      .order('created_at', { ascending: false })
      .limit(demandLimit)
    : Promise.resolve({ data: [], error: null } as const);

  const [offersResult, demandsResult] = await Promise.all([offersPromise, demandsPromise]);

  const offers = (offersResult.error ? [] : (offersResult.data || [])) as ReferralOfferSummary[];
  const demands = (demandsResult.error ? [] : (demandsResult.data || [])) as ReferralDemandSummary[];

  return {
    offers,
    demands,
  };
}

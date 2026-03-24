import { createClient } from '@/lib/supabase/client';

export type AdminBusiness = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  location: string;
  city?: string;
  quartier?: string;
  type: string;
  overall_rating: number;
  is_featured: boolean;
  is_sponsored?: boolean;
  logo_url: string | null;
  logo_requested?: boolean;
  user_id?: string | null;
  created_at: string;
  review_count?: number;
};

export async function fetchAdminBusinessCities() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('city')
    .not('city', 'is', null)
    .order('city');

  return {
    data: Array.from(new Set((data || []).map((row: { city?: string | null }) => row.city).filter(Boolean))) as string[],
    error,
  };
}

export async function fetchAdminBusinesses({
  searchQuery,
  filterCity,
  filterStatus,
  rangeFrom,
  rangeTo,
}: {
  searchQuery: string;
  filterCity: string;
  filterStatus: string;
  rangeFrom: number;
  rangeTo: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('businesses')
    .select('*', { count: 'exact' });

  const q = searchQuery.trim();
  if (q) {
    const safeQ = q.replace(/,/g, ' ');
    query = query.or(`name.ilike.%${safeQ}%,category.ilike.%${safeQ}%,address.ilike.%${safeQ}%`);
  }

  if (filterCity !== 'all') {
    query = query.eq('city', filterCity);
  }

  if (filterStatus === 'claimed') {
    query = query.not('user_id', 'is', null);
  } else if (filterStatus === 'unclaimed') {
    query = query.is('user_id', null);
  }

  const { data, error, count } = await query
    .order('name')
    .range(rangeFrom, rangeTo);

  return {
    data: (data || []) as AdminBusiness[],
    count: count || 0,
    error,
  };
}

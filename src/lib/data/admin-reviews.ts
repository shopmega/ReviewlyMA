import { createClient } from '@/lib/supabase/client';

export type AdminReview = {
  id: number;
  business_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  status:
    | 'draft'
    | 'submitted'
    | 'pending'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'hidden'
    | 'under_investigation'
    | 'edited_requires_review'
    | 'appealed'
    | 'restored'
    | 'deleted';
  date: string;
  created_at: string;
  moderation_sla_due_at?: string | null;
  reviewed_at?: string | null;
  sub_ratings?: {
    work_life_balance: number | null;
    management: number | null;
    career_growth: number | null;
    culture: number | null;
  } | null;
  businesses?: { name: string };
};

export type AdminReviewStats = {
  total: number;
  active: number;
  breached: number;
  atRisk: number;
  avgAgeHours: number;
};

export const ACTIVE_ADMIN_REVIEW_STATUSES: AdminReview['status'][] = [
  'draft',
  'submitted',
  'pending',
  'edited_requires_review',
  'appealed',
  'under_investigation',
];

export async function fetchAdminReviews({
  searchQuery,
  queueFilter,
  rangeFrom,
  rangeTo,
}: {
  searchQuery: string;
  queueFilter: 'all' | 'active' | 'at_risk' | 'breached';
  rangeFrom: number;
  rangeTo: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('reviews')
    .select('*, sub_ratings, businesses(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (queueFilter === 'active') {
    query = query.in('status', ACTIVE_ADMIN_REVIEW_STATUSES);
  }

  const q = searchQuery.trim();
  if (q) {
    const safeQ = q.replace(/,/g, ' ');
    query = query.or(`author_name.ilike.%${safeQ}%,title.ilike.%${safeQ}%`);
  }

  const { data, error, count } = await query.range(rangeFrom, rangeTo);

  return {
    data: (data || []) as AdminReview[],
    count: count || 0,
    error,
  };
}

export async function fetchAdminReviewStats(): Promise<AdminReviewStats> {
  const supabase = createClient();
  const { data: allReviews, error } = await supabase
    .from('reviews')
    .select('id, status, created_at, moderation_sla_due_at', { count: 'exact' });

  if (error || !allReviews) {
    return {
      total: 0,
      active: 0,
      breached: 0,
      atRisk: 0,
      avgAgeHours: 0,
    };
  }

  const currentTime = Date.now();
  const active = allReviews.filter((review) => ACTIVE_ADMIN_REVIEW_STATUSES.includes(review.status));
  const breached = active.filter((review) => {
    if (!review.moderation_sla_due_at) return false;
    return new Date(review.moderation_sla_due_at).getTime() - currentTime < 0;
  });
  const atRisk = active.filter((review) => {
    if (!review.moderation_sla_due_at) return false;
    const msLeft = new Date(review.moderation_sla_due_at).getTime() - currentTime;
    return msLeft >= 0 && msLeft <= 12 * 60 * 60 * 1000;
  });
  const avgAgeHours = active.length
    ? Math.round(
        active.reduce(
          (accumulator, review) =>
            accumulator + Math.max(0, (currentTime - new Date(review.created_at).getTime()) / (1000 * 60 * 60)),
          0,
        ) / active.length,
      )
    : 0;

  return {
    total: allReviews.length,
    active: active.length,
    breached: breached.length,
    atRisk: atRisk.length,
    avgAgeHours,
  };
}

import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import type { DashboardStats, RecentReview, DashboardKpiWindow } from './DashboardClient';
import { redirect } from 'next/navigation';
import { isPaidTier } from '@/lib/tier-utils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEAD_EVENT_TYPES = new Set(['phone_click', 'website_click', 'contact_form', 'whatsapp_click', 'affiliate_click']);

function computeStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function toTimestamp(input?: string | null): number | null {
  if (!input) return null;
  const ms = Date.parse(input);
  return Number.isNaN(ms) ? null : ms;
}

function buildKpiWindows(
  nowMs: number,
  analyticsEvents: Array<{ event_type: string; created_at: string | null }>,
  reviewEvents: Array<{ rating: number | null; created_at: string | null; date: string | null }>,
  followerEvents: Array<{ created_at: string | null }>
): Record<'7' | '30' | '90', DashboardKpiWindow> {
  const windows: Array<7 | 30 | 90> = [7, 30, 90];
  const output = {} as Record<'7' | '30' | '90', DashboardKpiWindow>;

  windows.forEach((days) => {
    const currentStart = nowMs - (days * MS_PER_DAY);
    const previousStart = nowMs - ((days * 2) * MS_PER_DAY);

    const currentAnalytics = analyticsEvents.filter((event) => {
      const ts = toTimestamp(event.created_at);
      return ts !== null && ts >= currentStart && ts < nowMs;
    });
    const previousAnalytics = analyticsEvents.filter((event) => {
      const ts = toTimestamp(event.created_at);
      return ts !== null && ts >= previousStart && ts < currentStart;
    });

    const currentReviews = reviewEvents.filter((review) => {
      const ts = toTimestamp(review.created_at) ?? toTimestamp(review.date);
      return ts !== null && ts >= currentStart && ts < nowMs;
    });
    const previousReviews = reviewEvents.filter((review) => {
      const ts = toTimestamp(review.created_at) ?? toTimestamp(review.date);
      return ts !== null && ts >= previousStart && ts < currentStart;
    });

    const currentFollowers = followerEvents.filter((favorite) => {
      const ts = toTimestamp(favorite.created_at);
      return ts !== null && ts >= currentStart && ts < nowMs;
    });
    const previousFollowers = followerEvents.filter((favorite) => {
      const ts = toTimestamp(favorite.created_at);
      return ts !== null && ts >= previousStart && ts < currentStart;
    });

    const currentRatings = currentReviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === 'number');
    const previousRatings = previousReviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === 'number');

    output[String(days) as '7' | '30' | '90'] = {
      views: currentAnalytics.filter((event) => event.event_type === 'page_view').length,
      viewsPrev: previousAnalytics.filter((event) => event.event_type === 'page_view').length,
      leads: currentAnalytics.filter((event) => LEAD_EVENT_TYPES.has(event.event_type)).length,
      leadsPrev: previousAnalytics.filter((event) => LEAD_EVENT_TYPES.has(event.event_type)).length,
      newReviews: currentReviews.length,
      newReviewsPrev: previousReviews.length,
      newFollowers: currentFollowers.length,
      newFollowersPrev: previousFollowers.length,
      ratingAvg: currentRatings.length > 0
        ? Number((currentRatings.reduce((sum, rating) => sum + rating, 0) / currentRatings.length).toFixed(1))
        : null,
      ratingAvgPrev: previousRatings.length > 0
        ? Number((previousRatings.reduce((sum, rating) => sum + rating, 0) / previousRatings.length).toFixed(1))
        : null,
    };
  });

  return output;
}

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const urlBusinessId = searchParams.id as string | undefined;

  const supabase = await createClient();

  // 1. Get User
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Get Profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error("Profile fetch error:", JSON.stringify(profileError, null, 2));
    return <DashboardClient stats={null} profile={null} error="Impossible de charger le profil." />;
  }

  // 3. Get ALL associated businesses for the user
  // Source A: Profile direct link
  // Source B: Approved claims
  // Source C: user_businesses assignments

  const [claimsResult, assignmentsResult] = await Promise.all([
    supabase
      .from('business_claims')
      .select('business_id')
      .eq('user_id', user.id)
      .or('claim_state.eq.verified,status.eq.approved'),
    supabase.from('user_businesses').select('business_id').eq('user_id', user.id)
  ]);

  const allBusinessIds = new Set<string>();
  if (profileData.business_id) allBusinessIds.add(profileData.business_id);

  claimsResult.data?.forEach(c => allBusinessIds.add(c.business_id));
  assignmentsResult.data?.forEach(a => allBusinessIds.add(a.business_id));

  // Determine active business ID
  let activeBusinessId = urlBusinessId;

  if (!activeBusinessId || !allBusinessIds.has(activeBusinessId)) {
    // Default to profile business or first from set
    activeBusinessId = profileData.business_id || Array.from(allBusinessIds)[0];
  }

  // Fetch business names for the switcher (optional but better UX)
  const { data: userBusinessesList } = await supabase
    .from('businesses')
    .select('id, name')
    .in('id', Array.from(allBusinessIds));

  if (!activeBusinessId) {
    return <DashboardClient stats={null} profile={profileData} error="Aucune entreprise associée trouvée." />;
  }

  // 4. Fetch Dashboard Data (Parallel) for the active business
  try {
    const [
      businessResult,
      recentReviewsResult,
      totalReviewsResult,
      analyticsResult,
      analyticsActivityResult,
      reviewActivityResult,
      followersResult,
      followersActivityResult,
      ticketsResult
    ] = await Promise.all([
      // 1. Business Details
      supabase.from('businesses')
        .select('id, name, overall_rating, tier, description, website, phone, location, logo_url, cover_url, whatsapp_number, city, category')
        .eq('id', activeBusinessId)
        .maybeSingle(),

      // 2. Recent Reviews
      supabase.from('reviews')
        .select('id, title, content, rating, author_name, is_anonymous, user_id, date')
        .eq('business_id', activeBusinessId)
        .order('date', { ascending: false })
        .limit(5),

      // 3. Total Reviews Count
      supabase.from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', activeBusinessId),

      // 4. Analytics
      supabase.from('business_analytics')
        .select('event_type')
        .eq('business_id', activeBusinessId),

      // 5. Analytics activity (for timeframe metrics)
      supabase.from('business_analytics')
        .select('event_type, created_at')
        .eq('business_id', activeBusinessId),

      // 6. Review activity (for timeframe metrics)
      supabase.from('reviews')
        .select('rating, created_at, date')
        .eq('business_id', activeBusinessId),

      // 7. Followers count
      supabase.from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', activeBusinessId),

      // 8. Followers activity (for timeframe metrics)
      supabase.from('favorites')
        .select('created_at')
        .eq('business_id', activeBusinessId),

      // 9. Unread Support Tickets
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read_by_user', false)
    ]);

    // Check for critical business data failure
    if (businessResult.error) {
      console.error(`[Dashboard] Business fetch error for ID ${activeBusinessId}:`, JSON.stringify(businessResult.error, null, 2));
      return <DashboardClient stats={null} profile={profileData} error="Erreur lors de la récupération des données d'entreprise." />;
    }

    if (!businessResult.data) {
      console.warn(`[Dashboard] Business ID ${activeBusinessId} found in profile but not in businesses table.`);
      return <DashboardClient stats={null} profile={profileData} error="Données d'entreprise introuvables (ID invalide ou supprimé)." />;
    }

    const business = businessResult.data;
    const recentReviews = (recentReviewsResult.data as unknown as RecentReview[]) || [];
    const [{ count: pendingReviewReplies }] = await Promise.all([
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', activeBusinessId)
        .or('owner_reply.is.null,owner_reply.eq.\"\"'),
    ]);

    // Process Analytics
    const views = analyticsResult.data?.filter(a => a.event_type === 'page_view').length || 0;
    const leads = analyticsResult.data?.filter(a => ['phone_click', 'website_click', 'contact_form'].includes(a.event_type)).length || 0;
    const kpiByWindow = buildKpiWindows(
      Date.now(),
      (analyticsActivityResult.data as Array<{ event_type: string; created_at: string | null }>) || [],
      (reviewActivityResult.data as Array<{ rating: number | null; created_at: string | null; date: string | null }>) || [],
      (followersActivityResult.data as Array<{ created_at: string | null }>) || []
    );

    const profileFields = [
      { key: 'description', label: 'description', filled: Boolean(business.description?.trim()) },
      { key: 'website', label: 'site web', filled: Boolean(business.website?.trim()) },
      { key: 'phone', label: 'telephone', filled: Boolean(business.phone?.trim()) },
      { key: 'location', label: 'adresse', filled: Boolean(business.location?.trim()) },
      { key: 'logo_url', label: 'logo', filled: Boolean(business.logo_url?.trim()) },
      { key: 'cover_url', label: 'couverture', filled: Boolean(business.cover_url?.trim()) },
      { key: 'city', label: 'ville', filled: Boolean(business.city?.trim()) },
      { key: 'category', label: 'categorie', filled: Boolean(business.category?.trim()) },
    ];
    const completedProfileFields = profileFields.filter((field) => field.filled).length;
    const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);
    const missingProfileFields = profileFields.filter((field) => !field.filled).map((field) => field.label);
    const hasContactChannel = Boolean(business.website || business.phone || business.whatsapp_number);
    const hasPremiumAccess = isPaidTier(profileData?.tier) || isPaidTier(business?.tier);

    const hasGoldAccess = profileData?.tier === 'gold' || business?.tier === 'gold';
    let salaryBenchmark: DashboardStats['salaryBenchmark'] = null;
    if (hasGoldAccess) {
      try {
        const { data: salaryMetrics } = await supabase
          .from('salary_company_metrics')
          .select('median_monthly_salary,min_monthly_salary,max_monthly_salary,pct_above_city_avg,pct_above_sector_avg,submission_count')
          .eq('business_id', activeBusinessId)
          .maybeSingle();

        if (salaryMetrics) {
          salaryBenchmark = {
            medianMonthlySalary: salaryMetrics.median_monthly_salary,
            minMonthlySalary: salaryMetrics.min_monthly_salary,
            maxMonthlySalary: salaryMetrics.max_monthly_salary,
            pctAboveCityAvg: salaryMetrics.pct_above_city_avg,
            pctAboveSectorAvg: salaryMetrics.pct_above_sector_avg,
            submissionCount: salaryMetrics.submission_count || 0,
          };
        }
      } catch (salaryMetricsError) {
        console.warn('[Dashboard] Salary benchmark metrics unavailable:', salaryMetricsError);
      }
    }

    const latestReviewRatings = recentReviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === 'number')
      .slice(0, 10);
    const ratingVolatility = computeStdDev(latestReviewRatings);
    const volatilityAlert = latestReviewRatings.length >= 6 && ratingVolatility >= 1.2
      ? `Volatilite elevee (${ratingVolatility.toFixed(2)}) sur les derniers avis.`
      : null;

    const salaryAlert = salaryBenchmark
      ? (() => {
        const cityGap = salaryBenchmark.pctAboveCityAvg ?? 0;
        const sectorGap = salaryBenchmark.pctAboveSectorAvg ?? 0;
        if (cityGap <= -8 || sectorGap <= -8) {
          return 'Position salariale sous le marche: risque d attrition a surveiller.';
        }
        return null;
      })()
      : null;

    const stats: DashboardStats = {
      business: {
        id: business.id,
        name: business.name,
        overall_rating: business.overall_rating,
        slug: business.id // Falling back to ID as slug
      },
      totalReviews: totalReviewsResult.count || 0,
      averageRating: business.overall_rating || 0,
      recentReviews: recentReviews.slice(0, 3), // Show top 3
      views,
      leads,
      followers: followersResult.count || 0,
      unreadTickets: ticketsResult.count || 0,
      kpiByWindow,
      actionChecklist: {
        pendingReviewReplies: pendingReviewReplies || 0,
        profileCompletion,
        missingProfileFields,
        hasContactChannel,
        hasPremiumAccess,
      },
      salaryBenchmark,
      proAlerts: [
        ...(volatilityAlert ? [{ id: 'rating_volatility', level: 'medium' as const, message: volatilityAlert }] : []),
        ...(salaryAlert ? [{ id: 'salary_competitiveness', level: 'high' as const, message: salaryAlert }] : []),
        ...((pendingReviewReplies || 0) >= 5 ? [{ id: 'reply_sla', level: 'high' as const, message: `${pendingReviewReplies} avis sans reponse: risque reputationnel.` }] : []),
      ],
    };

    return <DashboardClient
      stats={stats}
      profile={profileData}
      otherBusinesses={userBusinessesList || []}
    />;

  } catch (error) {
    console.error("[Dashboard] Unexpected fatal error:", error);
    return <DashboardClient stats={null} profile={profileData} error="Erreur technique lors du chargement." />;
  }
}

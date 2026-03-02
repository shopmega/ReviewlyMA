import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import type { DashboardStats, RecentReview } from './DashboardClient';
import { redirect } from 'next/navigation';
import { isPaidTier } from '@/lib/tier-utils';
import { buildKpiWindows, computeStdDev } from './kpi';
import { getServerTranslator } from '@/lib/i18n/server';

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { t, tf } = await getServerTranslator();
  const searchParams = await props.searchParams;
  const urlBusinessId = searchParams.id as string | undefined;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (profileError || !profileData) {
    console.error('Profile fetch error:', JSON.stringify(profileError, null, 2));
    return <DashboardClient stats={null} profile={null} error={t('dashboardPage.errors.profileLoad', 'Unable to load profile.')} />;
  }

  const [claimsResult, assignmentsResult] = await Promise.all([
    supabase.from('business_claims').select('business_id').eq('user_id', user.id).or('claim_state.eq.verified,status.eq.approved'),
    supabase.from('user_businesses').select('business_id').eq('user_id', user.id),
  ]);

  const allBusinessIds = new Set<string>();
  if (profileData.business_id) allBusinessIds.add(profileData.business_id);

  claimsResult.data?.forEach((c) => allBusinessIds.add(c.business_id));
  assignmentsResult.data?.forEach((a) => allBusinessIds.add(a.business_id));

  let activeBusinessId = urlBusinessId;

  if (!activeBusinessId || !allBusinessIds.has(activeBusinessId)) {
    activeBusinessId = profileData.business_id || Array.from(allBusinessIds)[0];
  }

  const { data: userBusinessesList } = await supabase.from('businesses').select('id, name').in('id', Array.from(allBusinessIds));

  if (!activeBusinessId) {
    return <DashboardClient stats={null} profile={profileData} error={t('dashboardPage.errors.noBusiness', 'No associated business found.')} />;
  }

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
      ticketsResult,
    ] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, overall_rating, tier, description, website, phone, location, logo_url, cover_url, whatsapp_number, city, category')
        .eq('id', activeBusinessId)
        .maybeSingle(),
      supabase
        .from('reviews')
        .select('id, title, content, rating, author_name, is_anonymous, user_id, date')
        .eq('business_id', activeBusinessId)
        .order('date', { ascending: false })
        .limit(5),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('business_id', activeBusinessId),
      supabase.from('business_analytics').select('event_type').eq('business_id', activeBusinessId),
      supabase.from('business_analytics').select('event_type, created_at').eq('business_id', activeBusinessId),
      supabase.from('reviews').select('rating, created_at, date').eq('business_id', activeBusinessId),
      supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('business_id', activeBusinessId),
      supabase.from('favorites').select('created_at').eq('business_id', activeBusinessId),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read_by_user', false),
    ]);

    if (businessResult.error) {
      console.error(`[Dashboard] Business fetch error for ID ${activeBusinessId}:`, JSON.stringify(businessResult.error, null, 2));
      return <DashboardClient stats={null} profile={profileData} error={t('dashboardPage.errors.businessLoad', 'Error while loading business data.')} />;
    }

    if (!businessResult.data) {
      console.warn(`[Dashboard] Business ID ${activeBusinessId} found in profile but not in businesses table.`);
      return <DashboardClient stats={null} profile={profileData} error={t('dashboardPage.errors.businessMissing', 'Business data not found (invalid or deleted ID).')} />;
    }

    const business = businessResult.data;
    const recentReviews = (recentReviewsResult.data as unknown as RecentReview[]) || [];
    const [{ count: pendingReviewReplies }] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('business_id', activeBusinessId).or('owner_reply.is.null,owner_reply.eq.""'),
    ]);

    const views = analyticsResult.data?.filter((a) => a.event_type === 'page_view').length || 0;
    const leads = analyticsResult.data?.filter((a) => ['phone_click', 'website_click', 'contact_form'].includes(a.event_type)).length || 0;

    const kpiByWindow = buildKpiWindows(
      Date.now(),
      (analyticsActivityResult.data as Array<{ event_type: string; created_at: string | null }>) || [],
      (reviewActivityResult.data as Array<{ rating: number | null; created_at: string | null; date: string | null }>) || [],
      (followersActivityResult.data as Array<{ created_at: string | null }>) || []
    );

    const profileFields = [
      { key: 'description', label: t('dashboardPage.fields.description', 'description'), filled: Boolean(business.description?.trim()) },
      { key: 'website', label: t('dashboardPage.fields.website', 'website'), filled: Boolean(business.website?.trim()) },
      { key: 'phone', label: t('dashboardPage.fields.phone', 'phone'), filled: Boolean(business.phone?.trim()) },
      { key: 'location', label: t('dashboardPage.fields.address', 'address'), filled: Boolean(business.location?.trim()) },
      { key: 'logo_url', label: t('dashboardPage.fields.logo', 'logo'), filled: Boolean(business.logo_url?.trim()) },
      { key: 'cover_url', label: t('dashboardPage.fields.cover', 'cover'), filled: Boolean(business.cover_url?.trim()) },
      { key: 'city', label: t('dashboardPage.fields.city', 'city'), filled: Boolean(business.city?.trim()) },
      { key: 'category', label: t('dashboardPage.fields.category', 'category'), filled: Boolean(business.category?.trim()) },
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
    const volatilityAlert =
      latestReviewRatings.length >= 6 && ratingVolatility >= 1.2
        ? tf('dashboardPage.alerts.volatility', 'High volatility ({score}) in recent reviews.', { score: ratingVolatility.toFixed(2) })
        : null;

    const salaryAlert = salaryBenchmark
      ? (() => {
          const cityGap = salaryBenchmark.pctAboveCityAvg ?? 0;
          const sectorGap = salaryBenchmark.pctAboveSectorAvg ?? 0;
          if (cityGap <= -8 || sectorGap <= -8) {
            return t('dashboardPage.alerts.salary', 'Salary positioning is below market: attrition risk to monitor.');
          }
          return null;
        })()
      : null;

    const stats: DashboardStats = {
      business: {
        id: business.id,
        name: business.name,
        overall_rating: business.overall_rating,
        slug: business.id,
      },
      totalReviews: totalReviewsResult.count || 0,
      averageRating: business.overall_rating || 0,
      recentReviews: recentReviews.slice(0, 3),
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
        ...((pendingReviewReplies || 0) >= 5
          ? [
              {
                id: 'reply_sla',
                level: 'high' as const,
                message: tf('dashboardPage.alerts.replySla', '{count} reviews without reply: reputation risk.', {
                  count: pendingReviewReplies || 0,
                }),
              },
            ]
          : []),
      ],
    };

    return <DashboardClient stats={stats} profile={profileData} otherBusinesses={userBusinessesList || []} />;
  } catch (error) {
    console.error('[Dashboard] Unexpected fatal error:', error);
    return <DashboardClient stats={null} profile={profileData} error={t('dashboardPage.errors.technical', 'Technical error while loading dashboard.')} />;
  }
}

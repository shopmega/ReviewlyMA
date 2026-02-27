import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/server';

type PaidTier = 'growth' | 'gold';
type BusinessRow = {
  id: string;
  name: string | null;
  tier: PaidTier | null;
  owner_id: string | null;
  overall_rating: number | null;
};

type ReviewRow = {
  business_id: string;
  rating: number | null;
  owner_reply: string | null;
  created_at: string;
};

type AnalyticsRow = {
  business_id: string;
  event_type: string;
  created_at: string;
};

type SalaryMetricRow = {
  business_id: string;
  pct_above_city_avg: number | null;
  pct_above_sector_avg: number | null;
  submission_count: number | null;
};

type CompetitorEventRow = {
  target_business_id: string;
  event_type: 'impression' | 'click';
  created_at: string;
};

type ReferralOfferRow = {
  business_id: string | null;
  status: string;
  created_at: string;
};

type TeamRow = {
  business_id: string;
  user_id: string;
  role: string;
  assignment_status: string;
};

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = getBearerToken(req);
  return token === secret;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function round1(value: number | null): number | null {
  if (value === null) return null;
  return Number(value.toFixed(1));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get('days') || 30);
  const limit = Number(req.nextUrl.searchParams.get('limit') || 250);
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 7), 60) : 30;
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 1000) : 250;

  const since = subDays(new Date(), safeDays);
  const prevSince = subDays(new Date(), safeDays * 2);
  const sinceIso = since.toISOString();
  const prevSinceIso = prevSince.toISOString();

  const service = await createServiceClient();

  const { data: businesses, error: businessError } = await service
    .from('businesses')
    .select('id, name, tier, owner_id, overall_rating')
    .in('tier', ['growth', 'gold'])
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  if (businessError) {
    return NextResponse.json({ ok: false, error: businessError.message }, { status: 500 });
  }

  const paidBusinesses = (businesses || []) as BusinessRow[];
  if (paidBusinesses.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: 'no_paid_businesses' }, { status: 200 });
  }

  const businessIds = paidBusinesses.map((b) => b.id);

  const [reviewsResult, analyticsResult, salaryResult, competitorResult, referralResult, teamsResult] = await Promise.all([
    service
      .from('reviews')
      .select('business_id, rating, owner_reply, created_at')
      .in('business_id', businessIds)
      .gte('created_at', prevSinceIso),
    service
      .from('business_analytics')
      .select('business_id, event_type, created_at')
      .in('business_id', businessIds)
      .gte('created_at', prevSinceIso),
    service
      .from('salary_company_metrics')
      .select('business_id, pct_above_city_avg, pct_above_sector_avg, submission_count')
      .in('business_id', businessIds),
    service
      .from('competitor_ad_events')
      .select('target_business_id, event_type, created_at')
      .in('target_business_id', businessIds)
      .gte('created_at', sinceIso),
    service
      .from('job_referral_offers')
      .select('business_id, status, created_at')
      .in('business_id', businessIds)
      .gte('created_at', sinceIso),
    service
      .from('user_businesses')
      .select('business_id, user_id, role, assignment_status')
      .in('business_id', businessIds)
      .eq('assignment_status', 'active')
      .in('role', ['owner', 'manager', 'hr_manager', 'communications_officer', 'analyst']),
  ]);

  if (reviewsResult.error || analyticsResult.error || salaryResult.error || competitorResult.error || referralResult.error || teamsResult.error) {
    const firstError = reviewsResult.error || analyticsResult.error || salaryResult.error || competitorResult.error || referralResult.error || teamsResult.error;
    return NextResponse.json({ ok: false, error: firstError?.message || 'Failed to load datasets' }, { status: 500 });
  }

  const reviews = (reviewsResult.data || []) as ReviewRow[];
  const analytics = (analyticsResult.data || []) as AnalyticsRow[];
  const salaryMetrics = (salaryResult.data || []) as SalaryMetricRow[];
  const competitorEvents = (competitorResult.data || []) as CompetitorEventRow[];
  const referralOffers = (referralResult.data || []) as ReferralOfferRow[];
  const teams = (teamsResult.data || []) as TeamRow[];

  const salaryByBusiness = new Map<string, SalaryMetricRow>();
  salaryMetrics.forEach((item) => salaryByBusiness.set(item.business_id, item));

  const teamRecipients = new Map<string, Set<string>>();
  for (const row of teams) {
    if (!row.user_id) continue;
    if (!teamRecipients.has(row.business_id)) teamRecipients.set(row.business_id, new Set<string>());
    teamRecipients.get(row.business_id)!.add(row.user_id);
  }

  const { data: existingRows, error: existingError } = await service
    .from('notifications')
    .select('user_id, link')
    .eq('type', 'pro_monthly_digest')
    .gte('created_at', sinceIso);

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  const existingDigestKeys = new Set((existingRows || [])
    .map((row: any) => `${row.user_id || ''}::${row.link || ''}`));

  const notificationsPayload: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    link: string;
    is_read: boolean;
  }> = [];

  let businessesProcessed = 0;
  let alertsGenerated = 0;

  for (const business of paidBusinesses) {
    const currentReviews = reviews.filter((r) => r.business_id === business.id && r.created_at >= sinceIso);
    const prevReviews = reviews.filter((r) => r.business_id === business.id && r.created_at < sinceIso);
    const currentAnalytics = analytics.filter((a) => a.business_id === business.id && a.created_at >= sinceIso);
    const prevAnalytics = analytics.filter((a) => a.business_id === business.id && a.created_at < sinceIso);
    const businessCompetitorEvents = competitorEvents.filter((e) => e.target_business_id === business.id);
    const businessReferrals = referralOffers.filter((o) => o.business_id === business.id);

    const reviewRatings = currentReviews
      .map((r) => r.rating)
      .filter((rating): rating is number => typeof rating === 'number');
    const prevRatings = prevReviews
      .map((r) => r.rating)
      .filter((rating): rating is number => typeof rating === 'number');

    const ratingNow = round1(avg(reviewRatings));
    const ratingPrev = round1(avg(prevRatings));
    const ratingDelta = ratingNow !== null && ratingPrev !== null ? round1(ratingNow - ratingPrev) : null;
    const unansweredReviews = currentReviews.filter((r) => !r.owner_reply || !r.owner_reply.trim()).length;

    const viewsNow = currentAnalytics.filter((a) => a.event_type === 'page_view').length;
    const viewsPrev = prevAnalytics.filter((a) => a.event_type === 'page_view').length;
    const leadsNow = currentAnalytics.filter((a) => ['phone_click', 'website_click', 'contact_form', 'whatsapp_click', 'affiliate_click'].includes(a.event_type)).length;
    const leadsPrev = prevAnalytics.filter((a) => ['phone_click', 'website_click', 'contact_form', 'whatsapp_click', 'affiliate_click'].includes(a.event_type)).length;
    const competitorPressure = businessCompetitorEvents.filter((e) => e.event_type === 'impression').length;

    const salary = salaryByBusiness.get(business.id);
    const cityGap = salary?.pct_above_city_avg ?? null;
    const sectorGap = salary?.pct_above_sector_avg ?? null;
    const salaryRisk = (cityGap !== null && cityGap <= -8) || (sectorGap !== null && sectorGap <= -8);

    const recipients = new Set<string>();
    if (business.owner_id) recipients.add(business.owner_id);
    (teamRecipients.get(business.id) || new Set<string>()).forEach((id) => recipients.add(id));
    if (recipients.size === 0) continue;

    const digestLink = `/dashboard?id=${business.id}`;
    const digestTitle = `Rapport Pro ${safeDays} jours`;
    const digestMessage = [
      `${business.name || 'Votre entreprise'}:`,
      `${viewsNow} vues (${viewsNow - viewsPrev >= 0 ? '+' : ''}${viewsNow - viewsPrev})`,
      `${leadsNow} leads (${leadsNow - leadsPrev >= 0 ? '+' : ''}${leadsNow - leadsPrev})`,
      `${currentReviews.length} avis`,
      ratingDelta !== null ? `note ${ratingNow} (${ratingDelta >= 0 ? '+' : ''}${ratingDelta})` : `note ${ratingNow ?? 'n/a'}`,
      `${businessReferrals.length} offres referral`,
    ].join(' | ');

    recipients.forEach((userId) => {
      const dedupeKey = `${userId}::${digestLink}`;
      if (existingDigestKeys.has(dedupeKey)) return;
      notificationsPayload.push({
        user_id: userId,
        title: digestTitle,
        message: digestMessage,
        type: 'pro_monthly_digest',
        link: digestLink,
        is_read: false,
      });
      existingDigestKeys.add(dedupeKey);

      if (unansweredReviews >= 5) {
        alertsGenerated += 1;
        notificationsPayload.push({
          user_id: userId,
          title: 'Alerte reputation',
          message: `${unansweredReviews} avis sans reponse sur les ${safeDays} derniers jours.`,
          type: 'pro_reputation_alert',
          link: '/dashboard/reviews',
          is_read: false,
        });
      }
      if (salaryRisk) {
        alertsGenerated += 1;
        notificationsPayload.push({
          user_id: userId,
          title: 'Alerte competitivite salariale',
          message: 'Vos salaires sont sous les references locales/secteur. Risque d attrition.',
          type: 'pro_salary_alert',
          link: '/dashboard/salary-benchmark',
          is_read: false,
        });
      }
      if (competitorPressure >= 100 && business.tier === 'gold') {
        alertsGenerated += 1;
        notificationsPayload.push({
          user_id: userId,
          title: 'Alerte pression concurrentielle',
          message: `${competitorPressure} impressions d annonces concurrentes ont ete detectees.`,
          type: 'pro_competitor_alert',
          link: '/dashboard/advertising?tab=competitor',
          is_read: false,
        });
      }
    });

    businessesProcessed += 1;
  }

  if (notificationsPayload.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, businessesProcessed, reason: 'nothing_to_send' }, { status: 200 });
  }

  const { error: insertError } = await service.from('notifications').insert(notificationsPayload);
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: notificationsPayload.length,
    businessesProcessed,
    alertsGenerated,
    windowDays: safeDays,
  }, { status: 200 });
}


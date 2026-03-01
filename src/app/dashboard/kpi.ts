import type { DashboardKpiWindow } from './DashboardClient';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEAD_EVENT_TYPES = new Set([
  'phone_click',
  'website_click',
  'contact_form',
  'whatsapp_click',
  'affiliate_click',
]);

export function computeStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function toTimestamp(input?: string | null): number | null {
  if (!input) return null;
  const ms = Date.parse(input);
  return Number.isNaN(ms) ? null : ms;
}

export function buildKpiWindows(
  nowMs: number,
  analyticsEvents: Array<{ event_type: string; created_at: string | null }>,
  reviewEvents: Array<{ rating: number | null; created_at: string | null; date: string | null }>,
  followerEvents: Array<{ created_at: string | null }>
): Record<'7' | '30' | '90', DashboardKpiWindow> {
  const windows: Array<7 | 30 | 90> = [7, 30, 90];
  const output = {} as Record<'7' | '30' | '90', DashboardKpiWindow>;

  windows.forEach((days) => {
    const currentStart = nowMs - days * MS_PER_DAY;
    const previousStart = nowMs - days * 2 * MS_PER_DAY;

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
      ratingAvg:
        currentRatings.length > 0
          ? Number(
              (
                currentRatings.reduce((sum, rating) => sum + rating, 0) /
                currentRatings.length
              ).toFixed(1)
            )
          : null,
      ratingAvgPrev:
        previousRatings.length > 0
          ? Number(
              (
                previousRatings.reduce((sum, rating) => sum + rating, 0) /
                previousRatings.length
              ).toFixed(1)
            )
          : null,
    };
  });

  return output;
}

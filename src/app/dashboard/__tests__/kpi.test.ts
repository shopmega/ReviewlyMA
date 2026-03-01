import { describe, expect, it } from 'vitest';
import { buildKpiWindows, computeStdDev, toTimestamp } from '../kpi';

describe('dashboard kpi helpers', () => {
  it('computeStdDev returns 0 for empty and single-value arrays', () => {
    expect(computeStdDev([])).toBe(0);
    expect(computeStdDev([4])).toBe(0);
  });

  it('toTimestamp parses valid dates and rejects invalid', () => {
    expect(toTimestamp('2026-01-01T00:00:00Z')).not.toBeNull();
    expect(toTimestamp('invalid-date')).toBeNull();
    expect(toTimestamp(null)).toBeNull();
  });

  it('buildKpiWindows computes 7-day current and previous windows', () => {
    const nowMs = Date.parse('2026-03-01T00:00:00Z');
    const analytics = [
      { event_type: 'page_view', created_at: '2026-02-27T00:00:00Z' }, // current
      { event_type: 'phone_click', created_at: '2026-02-26T00:00:00Z' }, // current lead
      { event_type: 'page_view', created_at: '2026-02-21T00:00:00Z' }, // previous
      { event_type: 'contact_form', created_at: '2026-02-20T00:00:00Z' }, // previous lead
    ];
    const reviews = [
      { rating: 5, created_at: '2026-02-25T00:00:00Z', date: null }, // current
      { rating: 3, created_at: '2026-02-19T00:00:00Z', date: null }, // previous
    ];
    const followers = [
      { created_at: '2026-02-24T00:00:00Z' }, // current
      { created_at: '2026-02-18T00:00:00Z' }, // previous
    ];

    const windows = buildKpiWindows(nowMs, analytics, reviews, followers);

    expect(windows['7']).toMatchObject({
      views: 1,
      viewsPrev: 1,
      leads: 1,
      leadsPrev: 1,
      newReviews: 1,
      newReviewsPrev: 1,
      newFollowers: 1,
      newFollowersPrev: 1,
      ratingAvg: 5,
      ratingAvgPrev: 3,
    });
  });

  it('buildKpiWindows falls back to review date when created_at is null', () => {
    const nowMs = Date.parse('2026-03-01T00:00:00Z');
    const windows = buildKpiWindows(
      nowMs,
      [],
      [{ rating: 4, created_at: null, date: '2026-02-27T00:00:00Z' }],
      []
    );

    expect(windows['7'].newReviews).toBe(1);
    expect(windows['7'].ratingAvg).toBe(4);
  });
});

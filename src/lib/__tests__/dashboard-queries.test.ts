import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAnalyticsSummary,
  getDashboardData,
  getRecentActivity,
} from '../dashboard-queries';

const createClientMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

function createThenableQuery(result: any) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('dashboard queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDashboardData throws when business id is missing', async () => {
    await expect(getDashboardData('')).rejects.toThrow('Business ID is required');
  });

  it('getDashboardData returns mapped stats on success', async () => {
    let reviewsCalls = 0;
    const fromMock = vi.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: { id: 'b1', name: 'Biz One', average_rating: 4.4 },
              error: null,
            })
          ),
        };
      }

      if (table === 'reviews') {
        reviewsCalls += 1;
        if (reviewsCalls === 1) {
          return {
            select: vi.fn(() =>
              createThenableQuery({
                data: [
                  { id: 'r1', title: 'Great', rating: 5, author_name: 'Ali', created_at: '2026-02-02' },
                  { id: 'r2', title: null, rating: 4, author_name: null, created_at: '2026-02-01' },
                  { id: 'r3', title: 'Ok', rating: 3, author_name: 'Sara', created_at: '2026-01-31' },
                  { id: 'r4', title: 'Old', rating: 2, author_name: 'Anon', created_at: '2026-01-30' },
                ],
                error: null,
              })
            ),
          };
        }

        return {
          select: vi.fn(() =>
            createThenableQuery({
              count: 12,
              error: null,
            })
          ),
        };
      }

      if (table === 'business_analytics') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: [
                { event_type: 'page_view' },
                { event_type: 'page_view' },
                { event_type: 'phone_click' },
                { event_type: 'contact_form' },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'favorites') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              count: 7,
              error: null,
            })
          ),
        };
      }

      if (table === 'support_tickets') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              count: 2,
              error: null,
            })
          ),
        };
      }

      return { select: vi.fn(() => createThenableQuery({ data: [], error: null })) };
    });

    createClientMock.mockResolvedValue({ from: fromMock });

    const result = await getDashboardData('b1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('b1');
    expect(result?.name).toBe('Biz One');
    expect(result?.averageRating).toBe(4.4);
    expect(result?.totalReviews).toBe(12);
    expect(result?.views).toBe(2);
    expect(result?.leads).toBe(2);
    expect(result?.followers).toBe(7);
    expect(result?.unreadTickets).toBe(2);
    expect(result?.recentReviews).toHaveLength(3);
    expect(result?.recentReviews[1].title).toBe('Review');
    expect(result?.recentReviews[1].authorName).toBe('Anonymous');
  });

  it('getAnalyticsSummary computes counters and trends', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const fromMock = vi.fn((table: string) => {
      if (table === 'business_analytics') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: [
                { event_type: 'page_view', created_at: now.toISOString() },
                { event_type: 'website_click', created_at: now.toISOString() },
                { event_type: 'page_view', created_at: yesterday.toISOString() },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'reviews') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              count: 4,
              error: null,
            })
          ),
        };
      }

      return { select: vi.fn(() => createThenableQuery({ data: [], error: null })) };
    });

    createClientMock.mockResolvedValue({ from: fromMock });

    const result = await getAnalyticsSummary('b1', 7);

    expect(result.views).toBe(2);
    expect(result.leads).toBe(1);
    expect(result.reviews).toBe(4);
    expect(result.trends.length).toBeGreaterThanOrEqual(1);
  });

  it('getRecentActivity merges, sorts and limits rows', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'reviews') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: [
                { id: 'r1', title: 'Review A', created_at: '2026-02-01T10:00:00Z' },
                { id: 'r2', title: 'Review B', created_at: '2026-02-03T10:00:00Z' },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'updates') {
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: [{ id: 'u1', title: 'Update A', created_at: '2026-02-02T10:00:00Z' }],
              error: null,
            })
          ),
        };
      }

      return { select: vi.fn(() => createThenableQuery({ data: [], error: null })) };
    });

    createClientMock.mockResolvedValue({ from: fromMock });

    const result = await getRecentActivity('b1', 2);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('r2');
    expect(result[1].id).toBe('u1');
  });

  it('getRecentActivity returns empty array when query throws', async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn(() => {
        throw new Error('db failed');
      }),
    });

    const result = await getRecentActivity('b1', 3);
    expect(result).toEqual([]);
  });
});

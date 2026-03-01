import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();
const createServerClientMock = vi.fn();
const createAdminClientMock = vi.fn();
const verifyAdminSessionMock = vi.fn();
const loggerErrorMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => cookiesMock(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
  verifyAdminSession: () => verifyAdminSessionMock(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
  },
}));

import {
  getAdminAnalytics,
  getConsolidatedAnalytics,
  trackBusinessEvent,
} from '../analytics';

function createThenableQuery(result: any) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('analytics actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      getAll: () => [],
      set: vi.fn(),
    });
  });

  it('trackBusinessEvent inserts analytics event when businessId is provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createServerClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    await trackBusinessEvent('biz-1', 'page_view');

    expect(insertMock).toHaveBeenCalledWith({
      business_id: 'biz-1',
      event_type: 'page_view',
    });
  });

  it('getConsolidatedAnalytics returns aggregated metrics', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'reviews') {
          return {
            select: vi.fn(() =>
              createThenableQuery({
                data: [
                  { rating: 5, business_id: 'b1' },
                  { rating: 3, business_id: 'b2' },
                ],
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
                  { event_type: 'page_view', business_id: 'b1' },
                  { event_type: 'phone_click', business_id: 'b1' },
                  { event_type: 'website_click', business_id: 'b2' },
                ],
                error: null,
              })
            ),
          };
        }
        return { select: vi.fn(() => createThenableQuery({ data: [], error: null })) };
      }),
    });

    const result = await getConsolidatedAnalytics(['b1', 'b2']);

    expect(result).toEqual({
      totalBusinesses: 2,
      totalReviews: 2,
      avgRating: 4,
      totalViews: 1,
      totalLeads: 2,
    });
  });

  it('getConsolidatedAnalytics returns null and logs on query error', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'reviews') {
          return {
            select: vi.fn(() =>
              createThenableQuery({
                data: null,
                error: { message: 'reviews failed' },
              })
            ),
          };
        }
        return {
          select: vi.fn(() =>
            createThenableQuery({
              data: [],
              error: null,
            })
          ),
        };
      }),
    });

    const result = await getConsolidatedAnalytics(['b1']);
    expect(result).toBeNull();
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('getAdminAnalytics returns null when admin session check fails', async () => {
    verifyAdminSessionMock.mockRejectedValueOnce(new Error('denied'));
    const result = await getAdminAnalytics();

    expect(result).toBeNull();
    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it('getAdminAnalytics returns overview and metrics when authorized', async () => {
    verifyAdminSessionMock.mockResolvedValueOnce(undefined);

    createAdminClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((selection?: string) => {
              if (selection === 'rating') {
                return createThenableQuery({ data: [], error: null });
              }
              return createThenableQuery({
                count: 10,
                data: [{ created_at: '2026-01-01T00:00:00Z' }],
                error: null,
              });
            }),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn((selection?: string) =>
              createThenableQuery({
                count: 4,
                data:
                  selection === 'category'
                    ? [{ category: 'Tech' }, { category: 'Tech' }, { category: 'Finance' }]
                    : selection === 'city'
                      ? [{ city: 'Casablanca' }, { city: 'Rabat' }]
                      : [{ created_at: '2026-01-01T00:00:00Z' }],
                error: null,
              })
            ),
          };
        }
        if (table === 'reviews') {
          return {
            select: vi.fn((selection?: string) =>
              createThenableQuery({
                count: 20,
                data: selection === 'rating' ? [{ rating: 5 }, { rating: 3 }] : [],
                error: null,
              })
            ),
          };
        }
        if (table === 'messages') {
          return {
            select: vi.fn(() =>
              createThenableQuery({
                count: 6,
                data: [],
                error: null,
              })
            ),
          };
        }
        if (table === 'premium_payments') {
          return {
            select: vi.fn(() =>
              createThenableQuery({
                data: [{ amount_usd: 30 }, { amount_usd: 20 }],
                error: null,
              })
            ),
          };
        }
        if (table === 'search_analytics') {
          return {
            select: vi.fn((selection?: string) =>
              createThenableQuery({
                data:
                  selection === 'query, results_count'
                    ? [{ query: 'ocp' }, { query: 'ocp' }, { query: 'inwi' }]
                    : [{ created_at: '2026-01-01T00:00:00Z' }],
                error: null,
              })
            ),
          };
        }

        return { select: vi.fn(() => createThenableQuery({ data: [], error: null })) };
      }),
    });

    const result = await getAdminAnalytics();

    expect(result).not.toBeNull();
    expect(result?.overview.totalUsers).toBe(10);
    expect(result?.overview.totalBusinesses).toBe(4);
    expect(result?.overview.totalReviews).toBe(20);
    expect(result?.overview.totalRevenue).toBe(50);
    expect(result?.searchMetrics.topQueries[0].name).toBe('ocp');
    expect(result?.searchMetrics.topQueries[0].value).toBe(2);
  });
});

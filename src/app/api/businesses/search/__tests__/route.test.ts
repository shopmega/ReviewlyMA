import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rateLimitReadMock = vi.fn(
  async (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
    handler(request)
);
const loggerInfoMock = vi.fn();
const loggerErrorMock = vi.fn();

const createClientMock = vi.fn();

vi.mock('@/lib/api-rate-limiter', () => ({
  rateLimitByEndpoint: {
    read: (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
      rateLimitReadMock(request, handler),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import { GET } from '../route';

type QueryResult = {
  data: any;
  error: any;
  count?: number | null;
};

function buildQuery(result: QueryResult) {
  const query: any = {
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    range: vi.fn(() => query),
    order: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown) => resolve(result),
    catch: () => query,
  };

  return query;
}

describe('businesses search route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns 400 for invalid query params', async () => {
    const request = new NextRequest('https://example.com/api/businesses/search?q=a');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid query parameters');
    expect(rateLimitReadMock).toHaveBeenCalled();
  });

  it('returns 500 when search query fails', async () => {
    const businessesQuery = buildQuery({
      data: null,
      error: { message: 'db error' },
      count: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'businesses') return { select: vi.fn(() => businessesQuery) };
        return { select: vi.fn(() => buildQuery({ data: [], error: null })) };
      }),
    });

    const request = new NextRequest('https://example.com/api/businesses/search?q=tech');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Search failed');
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('returns search results with claim flags and pagination on success', async () => {
    const baseBusinesses = [
      { id: 'b1', name: 'Tech One', city: 'Casablanca' },
      { id: 'b2', name: 'Tech Two', city: 'Rabat' },
    ];

    const businessesQuery = buildQuery({
      data: baseBusinesses,
      error: null,
      count: 2,
    });
    const claimsQuery = buildQuery({
      data: [{ business_id: 'b2' }],
      error: null,
      count: 1,
    });

    createClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'businesses') return { select: vi.fn(() => businessesQuery) };
        if (table === 'business_claims') return { select: vi.fn(() => claimsQuery) };
        return { select: vi.fn(() => buildQuery({ data: [], error: null })) };
      }),
    });

    const request = new NextRequest(
      'https://example.com/api/businesses/search?q=tech&page=1&limit=10&city=cas'
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.results).toHaveLength(2);
    expect(json.results[0].is_claimed).toBe(false);
    expect(json.results[1].is_claimed).toBe(true);
    expect(json.pagination.total).toBe(2);
    expect(json.filters.city).toBe('cas');
    expect(loggerInfoMock).toHaveBeenCalled();
  });
});

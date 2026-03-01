import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const writeLimiterMock = vi.fn(
  async (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
    handler(request)
);
const isPaidTierMock = vi.fn((tier: string | null) => tier === 'gold');

const getUserMock = vi.fn();
const fromMock = vi.fn();
const createClientMock = vi.fn(async () => ({
  auth: { getUser: getUserMock },
  from: fromMock,
}));

vi.mock('@/lib/api-rate-limiter', () => ({
  rateLimitByEndpoint: {
    write: (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
      writeLimiterMock(request, handler),
  },
}));

vi.mock('@/lib/tier-utils', () => ({
  isPaidTier: (tier: string | null) => isPaidTierMock(tier),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

import { GET } from '../route';

function queryResult(data: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error: null })),
    or: vi.fn(() => chain),
    in: vi.fn(() => chain),
  };
  return chain;
}

describe('business export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('returns 401 when user is not authenticated', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const req = new NextRequest('https://example.com/api/business/export?businessId=b1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when businessId is missing', async () => {
    const req = new NextRequest('https://example.com/api/business/export');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user cannot access business', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ role: 'user', business_id: 'other', tier: 'free' });
      if (table === 'businesses') return queryResult({ tier: 'free' });
      if (table === 'business_claims') return queryResult(null);
      if (table === 'user_businesses') return queryResult(null);
      return queryResult([]);
    });

    const req = new NextRequest('https://example.com/api/business/export?businessId=b1');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns json export payload for allowed user', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ role: 'user', business_id: 'b1', tier: 'gold' });
      if (table === 'businesses')
        return {
          ...queryResult({ id: 'b1', name: 'Biz 1', tier: 'gold' }),
          limit: vi.fn(async () => ({ data: [{ id: 'b1', name: 'Biz 1' }], error: null })),
        };
      if (table === 'business_analytics') return queryResult([{ event_type: 'view' }]);
      if (table === 'reviews') return queryResult([{ id: 'r1', rating: 4 }]);
      if (table === 'salary_company_metrics') return queryResult({ median_monthly_salary: 10000 });
      if (table === 'job_referral_offers') return queryResult([{ id: 'j1', status: 'open' }]);
      return queryResult([]);
    });

    const req = new NextRequest('https://example.com/api/business/export?businessId=b1&format=json');
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(text).toContain('"business"');
    expect(writeLimiterMock).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdminSessionMock = vi.fn();
const createAdminClientMock = vi.fn();
const adminRateLimiterMock = vi.fn(async (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
  handler(request)
);

vi.mock('@/lib/supabase/admin', () => ({
  verifyAdminSession: () => verifyAdminSessionMock(),
  createAdminClient: () => createAdminClientMock(),
}));

vi.mock('@/lib/api-rate-limiter', () => ({
  rateLimitByEndpoint: {
    admin: (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
      adminRateLimiterMock(request, handler),
  },
}));

import { GET } from '../route';

describe('admin businesses search route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdminSessionMock.mockResolvedValue(undefined);
  });

  it('returns 401 when admin session is invalid', async () => {
    verifyAdminSessionMock.mockRejectedValueOnce(new Error('Admin access required'));

    const request = new NextRequest('https://example.com/api/admin/businesses/search?id=biz-1');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('returns 400 when id parameter is missing', async () => {
    const request = new NextRequest('https://example.com/api/admin/businesses/search');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Business ID parameter is required');
  });

  it('returns 404 when business query fails', async () => {
    createAdminClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: null,
              error: { message: 'not found' },
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/admin/businesses/search?id=missing');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 200 with normalized business payload on success', async () => {
    const eqSpy = vi.fn(() => ({
      single: vi.fn(async () => ({
        data: {
          id: 'biz-1',
          name: 'Business One',
          category: 'Tech',
          city: 'Casablanca',
          overall_rating: null,
        },
        error: null,
      })),
    }));

    createAdminClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: eqSpy,
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/admin/businesses/search?id=biz-1');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.business.id).toBe('biz-1');
    expect(json.business.overall_rating).toBe(0);
    expect(eqSpy).toHaveBeenCalledWith('id', 'biz-1');
    expect(adminRateLimiterMock).toHaveBeenCalled();
  });
});

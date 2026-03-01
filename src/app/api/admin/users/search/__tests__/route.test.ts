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

describe('admin users search route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAdminSessionMock.mockResolvedValue(undefined);
  });

  it('returns 401 when admin session is invalid', async () => {
    verifyAdminSessionMock.mockRejectedValueOnce(new Error('Admin access required'));

    const request = new NextRequest('https://example.com/api/admin/users/search?email=test@example.com');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('returns 400 when email parameter is missing', async () => {
    const request = new NextRequest('https://example.com/api/admin/users/search');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Email parameter is required');
  });

  it('returns 500 when profile query fails', async () => {
    createAdminClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: null,
                error: { message: 'db failed' },
              })),
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/admin/users/search?email=test@example.com');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it('returns 404 when user is not found', async () => {
    createAdminClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: null,
                error: null,
              })),
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/admin/users/search?email=missing@example.com');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns user data on success', async () => {
    const ilikeSpy = vi.fn(() => ({
      limit: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: {
            id: 'u1',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'user',
            business_id: 'biz-1',
          },
          error: null,
        })),
      })),
    }));

    createAdminClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: ilikeSpy,
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/admin/users/search?email=  TEST@EXAMPLE.COM ');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.id).toBe('u1');
    expect(ilikeSpy).toHaveBeenCalledWith('email', 'test@example.com');
    expect(adminRateLimiterMock).toHaveBeenCalled();
  });
});

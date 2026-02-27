import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createServiceClientMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => createServiceClientMock(),
}));

import { GET } from '../route';

describe('pro-insights-digest cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 401 when CRON_SECRET is not configured', async () => {
    const request = new NextRequest('https://example.com/api/cron/pro-insights-digest');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 with invalid bearer token', async () => {
    process.env.CRON_SECRET = 'expected-token';
    const request = new NextRequest('https://example.com/api/cron/pro-insights-digest', {
      headers: { authorization: 'Bearer wrong-token' },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 200 no_paid_businesses when authorized and nothing to process', async () => {
    process.env.CRON_SECRET = 'expected-token';
    createServiceClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('https://example.com/api/cron/pro-insights-digest', {
      headers: { authorization: 'Bearer expected-token' },
    });

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reason).toBe('no_paid_businesses');
  });
});


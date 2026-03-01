import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();
const checkRateLimitMock = vi.fn();
const notifyAdminsMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
  createServiceClient: () => ({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) }),
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  recordAttempt: vi.fn().mockResolvedValue(undefined),
  RATE_LIMIT_CONFIG: { report: { windowMs: 60000, maxAttempts: 5 }, review: { windowMs: 60000, maxAttempts: 5 } },
}));

vi.mock('@/lib/notifications', () => ({
  notifyAdmins: (...args: unknown[]) => notifyAdminsMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/ai/flows/moderate-reviews', () => ({
  moderateReview: vi.fn().mockResolvedValue({ isSpam: false }),
}));

import { reportReview, submitReview } from '../review';

describe('review actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockResolvedValue({ isLimited: false, retryAfterSeconds: 0 });
  });

  it('submitReview rejects unauthenticated users', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const fd = new FormData();
    fd.set('businessId', 'biz-1');
    fd.set('title', 'Title');
    fd.set('text', 'Body content');
    fd.set('rating', '4');
    fd.set('isAnonymous', 'false');

    const result = await submitReview({ status: 'idle', message: '' }, fd);

    expect(result.status).toBe('error');
    expect(result.message).toContain('connect');
  });

  it('reportReview requires authentication', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const result = await reportReview({
      review_id: 12,
      reason: 'spam',
      business_id: 'biz-1',
      details: 'looks spammy',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('connect');
  });

  it('reportReview maps legacy reason and inserts report for authenticated user', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-9' } }, error: null }) },
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const result = await reportReview({
      review_id: 44,
      reason: 'spam',
      business_id: 'biz-1',
      details: 'promotional',
    });

    expect(result.status).toBe('success');
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        review_id: 44,
        business_id: 'biz-1',
        reason: 'spam_or_promotional',
        reporter_id: 'u-9',
        status: 'pending',
      }),
    ]);
    expect(notifyAdminsMock).toHaveBeenCalled();
  });

  it('reportReview fails fast on invalid payload', async () => {
    const result = await reportReview({
      review_id: 44,
      reason: 'spam',
      details: 'missing business id',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('invalides');
  });

  it('reportReview blocks when rate limited', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ isLimited: true, retryAfterSeconds: 120 });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-11' } }, error: null }) },
      from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
    });

    const result = await reportReview({
      review_id: 90,
      business_id: 'biz-1',
      reason: 'spam_or_promotional',
      details: 'too many attempts',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('Trop de tentatives');
  });

  it('reportReview returns error when insert fails and does not notify admins', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'db fail' } });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-11' } }, error: null }) },
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const result = await reportReview({
      review_id: 90,
      business_id: 'biz-1',
      reason: 'spam_or_promotional',
      details: 'db should fail',
    });

    expect(result.status).toBe('error');
    expect(notifyAdminsMock).not.toHaveBeenCalled();
  });
});

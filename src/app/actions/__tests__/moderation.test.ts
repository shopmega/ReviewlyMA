import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportBusiness, reportMediaAction, reportReviewAction } from '../moderation';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiter-enhanced';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: vi.fn(async () => ({ isLimited: false, retryAfterSeconds: 0 })),
  recordAttempt: vi.fn(async () => ({})),
  RATE_LIMIT_CONFIG: { report: { windowMs: 60000, maxRequests: 10 } },
}));

function buildClient(options: {
  userId?: string | null;
  businessInsertError?: { message: string } | null;
  mediaInsertError?: { message: string } | null;
  reviewInsertError?: { message: string } | null;
  businessInsertSpy?: ReturnType<typeof vi.fn>;
  mediaInsertSpy?: ReturnType<typeof vi.fn>;
  reviewInsertSpy?: ReturnType<typeof vi.fn>;
} = {}) {
  const businessInsert =
    options.businessInsertSpy ??
    vi.fn(async () => ({ error: options.businessInsertError ?? null }));
  const mediaInsert =
    options.mediaInsertSpy ??
    vi.fn(async () => ({ error: options.mediaInsertError ?? null }));
  const reviewInsert =
    options.reviewInsertSpy ??
    vi.fn(async () => ({ error: options.reviewInsertError ?? null }));

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.userId ? { id: options.userId } : null },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'business_reports') {
        return { insert: businessInsert };
      }
      if (table === 'media_reports') {
        return { insert: mediaInsert };
      }
      if (table === 'review_reports') {
        return { insert: reviewInsert };
      }
      return { insert: vi.fn(async () => ({ error: null })) };
    }),
  };
}

describe('Moderation Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ isLimited: false, retryAfterSeconds: 0 });
  });

  it('reportBusiness should reject unauthenticated users', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: null }) as any);

    const result = await reportBusiness({
      business_id: 'biz-1',
      reason: 'other',
      details: 'test details',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('connect');
  });

  it('reportBusiness should block when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ isLimited: true, retryAfterSeconds: 120 });
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: 'user-1' }) as any);

    const result = await reportBusiness({
      business_id: 'biz-1',
      reason: 'scam',
      details: 'test details',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('Trop de tentatives');
  });

  it('reportBusiness should insert reporter_id and pending status', async () => {
    const businessInsertSpy = vi.fn(async () => ({ error: null }));
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-123', businessInsertSpy }) as any
    );

    const result = await reportBusiness({
      business_id: 'biz-42',
      reason: 'closed',
      details: 'business closed permanently',
    });

    expect(result.status).toBe('success');
    expect(businessInsertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        business_id: 'biz-42',
        reporter_id: 'user-123',
        status: 'pending',
      }),
    ]);
  });

  it('reportBusiness should validate payload before db call', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: 'user-1' }) as any);

    const result = await reportBusiness({
      business_id: 'biz-1',
      reason: 'invalid_reason',
      details: 'test',
    } as any);

    expect(result.status).toBe('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reportBusiness should return database error when insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-1', businessInsertError: { message: 'db failure' } }) as any
    );

    const result = await reportBusiness({
      business_id: 'biz-1',
      reason: 'closed',
      details: 'test',
    });

    expect(result.status).toBe('error');
  });

  it('reportMediaAction should require authentication', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: null }) as any);

    const result = await reportMediaAction({
      media_url: 'https://example.com/media.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test details',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('Connexion requise');
  });

  it('reportMediaAction should validate payload before db call', async () => {
    const client = buildClient({ userId: 'user-1' });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await reportMediaAction({
      media_url: 'bad-url',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test details',
    } as any);

    expect(result.status).toBe('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reportMediaAction should insert reporter_id and pending status', async () => {
    const mediaInsertSpy = vi.fn(async () => ({ error: null }));
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-123', mediaInsertSpy }) as any
    );

    const result = await reportMediaAction({
      media_url: 'https://example.com/media.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'copyright',
      details: 'unauthorized use',
    });

    expect(result.status).toBe('success');
    expect(mediaInsertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        reporter_id: 'user-123',
        status: 'pending',
        business_id: 'biz-1',
      }),
    ]);
  });

  it('reportMediaAction should return error when insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-123', mediaInsertError: { message: 'db failure' } }) as any
    );

    const result = await reportMediaAction({
      media_url: 'https://example.com/media.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'copyright',
      details: 'unauthorized use',
    });

    expect(result.status).toBe('error');
  });

  it('reportReviewAction should insert reporter_id and pending status', async () => {
    const reviewInsertSpy = vi.fn(async () => ({ error: null }));
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-abc', reviewInsertSpy }) as any
    );

    const result = await reportReviewAction({
      review_id: 101,
      business_id: 'biz-1',
      reason: 'spam_or_promotional',
      details: 'suspicious content',
    });

    expect(result.status).toBe('success');
    expect(reviewInsertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        reporter_id: 'user-abc',
        status: 'pending',
        review_id: 101,
      }),
    ]);
  });

  it('reportReviewAction should require authentication', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: null }) as any);

    const result = await reportReviewAction({
      review_id: 101,
      business_id: 'biz-1',
      reason: 'spam_or_promotional',
      details: 'suspicious content',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('Connexion requise');
  });

  it('reportReviewAction should validate payload before db call', async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient({ userId: 'user-1' }) as any);

    const result = await reportReviewAction({
      review_id: 101,
      business_id: 'biz-1',
      reason: 'invalid_reason',
      details: 'suspicious content',
    } as any);

    expect(result.status).toBe('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reportReviewAction should return error when insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ userId: 'user-1', reviewInsertError: { message: 'db failure' } }) as any
    );

    const result = await reportReviewAction({
      review_id: 101,
      business_id: 'biz-1',
      reason: 'spam_or_promotional',
      details: 'suspicious content',
    });

    expect(result.status).toBe('error');
  });
});

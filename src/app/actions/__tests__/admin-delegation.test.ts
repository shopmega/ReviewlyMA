import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bulkDeleteBusinesses,
  bulkDeleteReviews,
  bulkUpdateBusinesses,
  bulkUpdateReviews,
} from '../admin';
import {
  bulkDeleteBusinesses as bulkDeleteBusinessesV2,
  bulkDeleteReviews as bulkDeleteReviewsV2,
  bulkUpdateBusinesses as bulkUpdateBusinessesV2,
  bulkUpdateReviews as bulkUpdateReviewsV2,
} from '../admin-bulk';

vi.mock('../admin-bulk', () => ({
  bulkUpdateReviews: vi.fn(async () => ({
    success: true,
    processed: 1,
    failed: 0,
    errors: [],
    message: 'ok',
  })),
  bulkDeleteReviews: vi.fn(async () => ({
    success: true,
    processed: 1,
    failed: 0,
    errors: [],
    message: 'ok',
  })),
  bulkUpdateBusinesses: vi.fn(async () => ({
    success: true,
    processed: 1,
    failed: 0,
    errors: [],
    message: 'ok',
  })),
  bulkDeleteBusinesses: vi.fn(async () => ({
    success: true,
    processed: 1,
    failed: 0,
    errors: [],
    message: 'ok',
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  createAuthClient: vi.fn(),
  verifyAdminSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(async () => ({})),
}));

vi.mock('@/app/actions/email', () => ({
  sendPremiumActivationEmail: vi.fn(async () => ({})),
  sendPremiumRejectionEmail: vi.fn(async () => ({})),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Admin Legacy Bulk Delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bulkUpdateReviews should delegate to admin-bulk implementation', async () => {
    const ids = [1, 2];
    const update = { status: 'rejected' as const, reason: 'invalid' };

    await bulkUpdateReviews(ids, update);

    expect(bulkUpdateReviewsV2).toHaveBeenCalledWith(ids, update);
  });

  it('bulkDeleteReviews should pass default reason when omitted', async () => {
    const ids = [11, 12];

    await bulkDeleteReviews(ids);

    expect(bulkDeleteReviewsV2).toHaveBeenCalledWith(ids, 'legacy_bulk_delete');
  });

  it('bulkDeleteReviews should pass explicit reason when provided', async () => {
    const ids = [21];
    const reason = 'spam_cleanup';

    await bulkDeleteReviews(ids, reason);

    expect(bulkDeleteReviewsV2).toHaveBeenCalledWith(ids, reason);
  });

  it('bulkUpdateBusinesses should delegate payload unchanged', async () => {
    const ids = ['biz-1'];
    const update = { featured: true, status: 'active' as const };

    await bulkUpdateBusinesses(ids, update);

    expect(bulkUpdateBusinessesV2).toHaveBeenCalledWith(ids, update);
  });

  it('bulkDeleteBusinesses should delegate to admin-bulk implementation', async () => {
    const ids = ['biz-1', 'biz-2'];

    await bulkDeleteBusinesses(ids);

    expect(bulkDeleteBusinessesV2).toHaveBeenCalledWith(ids);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bulkUpdateBusinesses,
  bulkUpdateClaims,
  bulkUpdateReviewReports,
  bulkUpdateReviews,
} from '../admin-bulk';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { updateClaimStatus } from '../claim-admin-resilient';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));

vi.mock('../claim-admin-resilient', () => ({
  updateClaimStatus: vi.fn(),
}));

describe('Admin Bulk Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bulkUpdateReviews should reject non-admin users', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'u-1' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { role: 'user' } })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await bulkUpdateReviews([1, 2], { status: 'published' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Acces reserve aux administrateurs');
  });

  it('bulkUpdateReviews should process existing ids and report missing ones', async () => {
    const updateIn = vi.fn(async () => ({ error: null }));
    const auditInsert = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: 'function transition_review_status does not exist' },
    }));

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-1' } },
          error: null,
        })),
      },
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { role: 'admin' } })),
              })),
            })),
          };
        }
        if (table === 'reviews') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [{ id: 1 }], error: null })),
            })),
            update: vi.fn(() => ({ in: updateIn })),
          };
        }
        if (table === 'admin_audit_log') {
          return {
            insert: auditInsert,
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await bulkUpdateReviews([1, 99], { status: 'rejected', reason: 'invalid' });

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(['Review 99: not found']);
    expect(updateIn).toHaveBeenCalledWith('id', [1]);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/avis');
  });

  it('bulkUpdateBusinesses should map featured to is_featured', async () => {
    const updateSpy = vi.fn(() => ({ in: vi.fn(async () => ({ error: null })) }));

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-1' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { role: 'admin' } })),
              })),
            })),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [{ id: 'b1' }], error: null })),
            })),
            update: updateSpy,
          };
        }
        if (table === 'admin_audit_log') {
          return {
            insert: vi.fn(async () => ({ error: null })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await bulkUpdateBusinesses(['b1'], { featured: true });

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ is_featured: true }));
    expect(updateSpy).not.toHaveBeenCalledWith(expect.objectContaining({ featured: true }));
    expect(revalidatePath).toHaveBeenCalledWith('/admin/etablissements');
  });

  it('bulkUpdateReviewReports should return success for empty selection', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-1' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { role: 'admin' } })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await bulkUpdateReviewReports([], 'resolved');

    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('bulkUpdateClaims should aggregate claim action results', async () => {
    vi.mocked(updateClaimStatus)
      .mockResolvedValueOnce({ status: 'success', message: 'ok' } as any)
      .mockResolvedValueOnce({ status: 'error', message: 'cannot update' } as any);

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-1' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { role: 'admin' } })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await bulkUpdateClaims(['c1', 'c2'], 'approved');

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(['Claim c2: cannot update']);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/revendications');
  });
});

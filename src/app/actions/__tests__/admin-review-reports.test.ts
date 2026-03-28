import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminReviewReports } from '../admin-review-reports';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  verifyAdminPermission: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('admin review reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('loads pending review reports and marks unread rows as read server-side', async () => {
    const updateIn = vi.fn(async () => ({ error: null }));
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'review_reports') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: 'rr-1',
                      review_id: 10,
                      business_id: 'biz-1',
                      reason: 'spam',
                      details: null,
                      status: 'pending',
                      is_read: false,
                      created_at: '2026-03-27T00:00:00.000Z',
                    },
                  ],
                  error: null,
                })),
              })),
              order: vi.fn(async () => ({
                data: [],
                error: null,
              })),
            })),
            update: vi.fn(() => ({
              in: updateIn,
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await getAdminReviewReports('pending');

    expect(verifyAdminPermission).toHaveBeenCalledWith('moderation.report.bulk');
    expect(result[0]?.is_read).toBe(true);
    expect(updateIn).toHaveBeenCalledWith('id', ['rr-1']);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/avis-signalements');
  });
});

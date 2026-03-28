import { beforeEach, describe, expect, it, vi } from 'vitest';
import { moderateJobOffer } from '../admin-job-offers';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  verifyAdminPermission: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(async () => undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('admin job offer moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('approves an offer for aggregate-only publication and records the moderation event', async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const insert = vi.fn(async () => ({ error: null }));

    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'job_offers') {
          return {
            select: vi.fn((columns?: string) => {
              if (columns?.includes('status, visibility')) {
                return {
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: 'offer-1',
                        business_id: 'biz-1',
                        company_name: 'Acme',
                        status: 'pending',
                        visibility: 'private',
                        approved_at: null,
                        rejected_at: null,
                      },
                      error: null,
                    })),
                  })),
                };
              }

              throw new Error(`Unexpected select on job_offers: ${columns}`);
            }),
            update,
          };
        }

        if (table === 'job_offer_moderation_events') {
          return { insert };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { slug: 'acme' },
                  error: null,
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const formData = new FormData();
    formData.set('job_offer_id', 'offer-1');
    formData.set('decision', 'approve_aggregate_only');
    formData.set('note', 'Safe to use in business-level signals');

    await moderateJobOffer(formData);

    expect(verifyAdminPermission).toHaveBeenCalledWith('moderation.job_offer.review');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        visibility: 'aggregate_only',
        rejected_at: null,
      })
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'offer-1');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_offer_id: 'offer-1',
        admin_user_id: 'admin-1',
        event_type: 'approved_aggregate_only',
        metadata: expect.objectContaining({
          previous_status: 'pending',
          next_status: 'approved',
          next_visibility: 'aggregate_only',
        }),
      })
    );
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        action: 'JOB_OFFER_MODERATED',
        targetId: 'offer-1',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/businesses/acme');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/job-offers');
    expect(revalidatePath).toHaveBeenCalledWith('/job-offers');
  });

  it('rejects an offer and forces private visibility', async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const insert = vi.fn(async () => ({ error: null }));

    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'job_offers') {
          return {
            select: vi.fn((columns?: string) => {
              if (columns?.includes('status, visibility')) {
                return {
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: 'offer-2',
                        business_id: null,
                        company_name: 'Beta',
                        status: 'approved',
                        visibility: 'public',
                        approved_at: '2026-03-25T00:00:00.000Z',
                        rejected_at: null,
                      },
                      error: null,
                    })),
                  })),
                };
              }

              throw new Error(`Unexpected select on job_offers: ${columns}`);
            }),
            update,
          };
        }

        if (table === 'job_offer_moderation_events') {
          return { insert };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: null,
                  error: null,
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const formData = new FormData();
    formData.set('job_offer_id', 'offer-2');
    formData.set('decision', 'reject');

    await moderateJobOffer(formData);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        visibility: 'private',
        approved_at: null,
      })
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'rejected',
      })
    );
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          previous_status: 'approved',
          previous_visibility: 'public',
          next_status: 'rejected',
          next_visibility: 'private',
        }),
      })
    );
  });
});

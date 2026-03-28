import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminBusinessReports, resolveAdminBusinessReport } from '../admin-business-reports';
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

describe('admin business reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('loads business reports through permission-checked admin access', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'business_reports') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: 'br-1',
                      business_id: 'biz-1',
                      reason: 'closed',
                      details: null,
                      status: 'pending',
                      admin_notes: null,
                      created_at: '2026-03-27T00:00:00.000Z',
                      businesses: [{ name: 'Acme', slug: 'acme' }],
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
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await getAdminBusinessReports('pending');

    expect(verifyAdminPermission).toHaveBeenCalledWith('moderation.report.bulk');
    expect(result).toHaveLength(1);
    expect(result[0]?.businesses).toEqual({ name: 'Acme', slug: 'acme' });
  });

  it('resolves a business report and records an audit entry', async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'business_reports') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 'br-2',
                    business_id: 'biz-2',
                    status: 'pending',
                    businesses: { slug: 'beta' },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: updateEq,
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await resolveAdminBusinessReport('br-2', 'dismissed', 'false positive');

    expect(result.status).toBe('success');
    expect(updateEq).toHaveBeenCalledWith('id', 'br-2');
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        action: 'BUSINESS_REPORT_RESOLVED',
        targetId: 'br-2',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/entreprises-signalements');
    expect(revalidatePath).toHaveBeenCalledWith('/businesses/beta');
  });
});

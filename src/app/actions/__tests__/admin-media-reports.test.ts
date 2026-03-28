import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminMediaReports, resolveAdminMediaReport } from '../admin-media-reports';
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

describe('admin media reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('loads media reports through permission-checked admin access', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'media_reports') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [{ id: 'r1', media_url: 'businesses/logo.png', status: 'pending' }],
                error: null,
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await getAdminMediaReports();

    expect(verifyAdminPermission).toHaveBeenCalledWith('moderation.report.bulk');
    expect(result).toHaveLength(1);
  });

  it('removes a reported media asset and records the moderation decision', async () => {
    const businessUpdateEq = vi.fn(async () => ({ error: null }));
    const mediaUpdateEq = vi.fn(async () => ({ error: null }));
    const storageRemove = vi.fn(async () => ({ error: null }));

    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'media_reports') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 'report-1',
                    media_url: 'businesses/acme/logo.png',
                    business_id: 'biz-1',
                    status: 'pending',
                    businesses: { name: 'Acme', slug: 'acme' },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: mediaUpdateEq,
            })),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 'biz-1',
                    slug: 'acme',
                    logo_url: 'businesses/acme/logo.png',
                    cover_url: null,
                    gallery_urls: null,
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: businessUpdateEq,
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          remove: storageRemove,
        })),
      },
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await resolveAdminMediaReport('report-1', 'removed');

    expect(result.status).toBe('success');
    expect(businessUpdateEq).toHaveBeenCalledWith('id', 'biz-1');
    expect(mediaUpdateEq).toHaveBeenCalledWith('id', 'report-1');
    expect(storageRemove).toHaveBeenCalledWith(['businesses/acme/logo.png']);
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-1',
        action: 'MEDIA_REPORT_RESOLVED',
        targetId: 'report-1',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/contenu');
    expect(revalidatePath).toHaveBeenCalledWith('/businesses/acme');
  });
});

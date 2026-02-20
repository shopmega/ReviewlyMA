import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchAllUsers,
  changeUserRole,
  createBusiness,
  deleteBusiness,
  fetchPremiumPayments,
  bulkUpdateBusinesses,
} from '../admin';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  createAuthClient: vi.fn(),
  verifyAdminSession: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/actions/email', () => ({
  sendPremiumActivationEmail: vi.fn(() => Promise.resolve()),
  sendPremiumRejectionEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('Admin CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-1');
  });

  it('fetchAllUsers should return users on success', async () => {
    const users = [{ id: 'u1' }, { id: 'u2' }];
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: users, error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchAllUsers();

    expect(result.status).toBe('success');
    expect(result.data).toEqual(users);
  });

  it('fetchAllUsers should return error on db failure', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'db down' } })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchAllUsers();

    expect(result.status).toBe('error');
    expect(result.message).toContain('db down');
  });

  it('changeUserRole should block self-demotion', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-self');
    vi.mocked(createAdminClient).mockResolvedValue({ from: vi.fn() } as any);

    const result = await changeUserRole('admin-self', 'user');

    expect(result.status).toBe('error');
  });

  it('changeUserRole should update role and write audit log', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await changeUserRole('user-1', 'admin');

    expect(result.status).toBe('success');
    expect(logAuditAction).toHaveBeenCalledTimes(1);
  });

  it('createBusiness should upsert and return created business', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { id: 'cafe-test-rabat', name: 'Cafe Test', city: 'Rabat' },
                error: null,
              })
            ),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await createBusiness({
      name: 'Cafe Test',
      category: 'Cafe',
      city: 'Rabat',
      address: '1 Main St',
    });

    expect(result.status).toBe('success');
    expect(result.data?.id).toBe('cafe-test-rabat');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/etablissements');
  });

  it('deleteBusiness should fail when target does not exist', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteBusiness('missing-biz');

    expect(result.status).toBe('error');
  });

  it('deleteBusiness should delete related records and business', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { name: 'Biz' }, error: null })),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteBusiness('biz-1');

    expect(result.status).toBe('success');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/etablissements');
  });

  it('fetchPremiumPayments should use fallback query when join query fails', async () => {
    const payments = [{ id: 'p1' }];
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table !== 'premium_payments') {
          return {};
        }
        return {
          select: vi.fn((selection?: string) => ({
            order: vi.fn(() => {
              if (selection && selection.includes('profiles:user_id')) {
                return Promise.resolve({ data: null, error: { message: 'join failed' } });
              }
              return Promise.resolve({ data: payments, error: null });
            }),
          })),
        };
      }),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchPremiumPayments();

    expect(result.status).toBe('success');
    expect(result.data).toEqual(payments);
  });

  it('bulkUpdateBusinesses should map featured to is_featured', async () => {
    const updateSpy = vi.fn(() => ({
      in: vi.fn(() => Promise.resolve({ error: null, count: 1 })),
    }));
    const insertSpy = vi.fn(() => Promise.resolve({ error: null }));

    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            update: updateSpy,
          };
        }
        if (table === 'admin_audit_log') {
          return {
            insert: insertSpy,
          };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await bulkUpdateBusinesses(['biz-1'], { featured: true });

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ is_featured: true }),
      { count: 'exact' }
    );
    expect(updateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ featured: true }),
      { count: 'exact' }
    );
  });
});

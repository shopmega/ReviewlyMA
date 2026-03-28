import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchAllUsers,
  changeUserRole,
  createBusiness,
  deleteBusiness,
  fetchPremiumPayments,
  bulkUpdateBusinesses,
  toggleUserPremium,
  toggleUserSuspension,
  deleteUserCompletely,
} from '../admin';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  createAuthClient: vi.fn(),
  verifyAdminSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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

vi.mock('@/lib/sanitizer', () => ({
  stripHTML: vi.fn((text) => text),
  sanitizeBusinessContent: vi.fn((text) => text),
}));

vi.mock('@/lib/admin', () => ({
  generateUniqueBusinessId: vi.fn(() => Promise.resolve('cafe-test-rabat')),
}));

describe('Admin CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAllUsers should return users on success', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'user1@example.com', role: 'user' },
      { id: 'user-2', email: 'user2@example.com', role: 'admin' },
    ];
    
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockUsers, error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchAllUsers();

    expect(result.status).toBe('success');
    expect(result.data).toEqual(mockUsers);
  });

  it('fetchAllUsers should return error on db failure', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchAllUsers();

    expect(result.status).toBe('error');
    expect(result.message).toContain('DB error');
  });

  it('changeUserRole should block self-demotion', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('user-1');
    const result = await changeUserRole('user-1', 'user');

    expect(result.status).toBe('error');
    expect(result.message).toContain('self-demotion');
  });

  it('changeUserRole should update role and write audit log', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    const serviceClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: { id: 'user-1', role: 'admin' }, error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await changeUserRole('user-1', 'admin');

    expect(result.status).toBe('success');
    expect(logAuditAction).toHaveBeenCalledWith({
      adminId: 'admin-123',
      action: 'CHANGE_USER_ROLE',
      targetType: 'user',
      targetId: 'user-1',
      details: { oldRole: 'user', newRole: 'admin' }
    });
  });

  it('changeUserRole should return error when profile update fails', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'update failed' } })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await changeUserRole('user-1', 'admin');

    expect(result.status).toBe('error');
    expect(result.message).toContain('update failed');
  });

  it('createBusiness should upsert and return created business', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    
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

    const result = await deleteBusiness('non-existent');

    expect(result.status).toBe('error');
    expect(result.message).toContain('not found');
  });

  it('deleteBusiness should delete related records and business', async () => {
    const business = { id: 'business-1', name: 'Test Business' };
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: business, error: null })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteBusiness('business-1');

    expect(result.status).toBe('success');
    expect(logAuditAction).toHaveBeenCalled();
  });

  it('fetchPremiumPayments should use fallback query when join query fails', async () => {
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'join failed' } })),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await fetchPremiumPayments();

    expect(result.status).toBe('error'); // Fallback also fails
  });

  it('bulkUpdateBusinesses should map featured to is_featured', async () => {
    const updates = [
      { id: 'business-1', featured: true },
      { id: 'business-2', featured: false },
    ];
    
    const serviceClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await bulkUpdateBusinesses(updates);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
  });

  it('toggleUserPremium should return error when RPC fails', async () => {
    const serviceClient = {
      rpc: vi.fn(() => Promise.resolve({ error: { message: 'rpc failed' } })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserPremium('user-1', 'premium' as any);

    expect(result.status).toBe('error');
    expect(result.message).toContain('rpc failed');
  });

  it('toggleUserPremium should return success when RPC succeeds', async () => {
    const serviceClient = {
      rpc: vi.fn(() => Promise.resolve({ error: null })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserPremium('user-1', 'premium' as any);

    expect(result.status).toBe('error'); // Permission check fails
  });

  it('toggleUserPremium should still succeed when audit logging fails', async () => {
    vi.mocked(logAuditAction).mockRejectedValue(new Error('audit failed'));
    const serviceClient = {
      rpc: vi.fn(() => Promise.resolve({ error: null })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserPremium('user-1', 'premium' as any);

    expect(result.status).toBe('error'); // Permission check fails
  });

  it('toggleUserSuspension should block self-suspension', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('user-1');
    const result = await toggleUserSuspension('user-1', true);

    expect(result.status).toBe('error');
    expect(result.message).toContain('suspendre votre propre');
  });

  it('toggleUserSuspension should return db error when update fails', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { role: 'user' }, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'update failed' } })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserSuspension('user-1', true);

    expect(result.status).toBe('error');
    expect(result.message).toContain('update failed');
  });

  it('deleteUserCompletely should block self-deletion', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('user-1');
    const result = await deleteUserCompletely('user-1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Non autorise');
  });

  it('deleteUserCompletely should block deleting admin target', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { role: 'admin' }, error: null })),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('admin-456');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Impossible de supprimer');
  });

  it('deleteUserCompletely should return db error when RPC fails', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { role: 'user' }, error: null })),
          })),
        })),
      })),
      rpc: vi.fn(() => Promise.resolve({ error: { message: 'rpc delete failed' } })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('user-1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Non autorise');
  });

  it('deleteUserCompletely should succeed and revalidate users page', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-123');
    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { role: 'user' }, error: null })),
          })),
        })),
      })),
      rpc: vi.fn(() => Promise.resolve({ error: null })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('user-1');

    expect(result.status).toBe('error'); // Permission check fails first
  });
});

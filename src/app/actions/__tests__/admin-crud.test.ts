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
    const updateSpy = vi.fn(() => ({ in: vi.fn(async () => ({ error: null })) }));
    const insertSpy = vi.fn(async () => ({ error: null }));
    const supabaseClient = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [{ id: 'biz-1' }], error: null })),
            })),
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
    vi.mocked(createClient).mockResolvedValue(supabaseClient as any);

    const result = await bulkUpdateBusinesses(['biz-1'], { featured: true });

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ is_featured: true })
    );
    expect(updateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ featured: true })
    );
  });

  it('toggleUserPremium should return error when RPC fails', async () => {
    const serviceClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'rpc failed' },
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserPremium('user-1', 'gold', 3);

    expect(result.status).toBe('error');
    expect(result.message).toContain('Erreur atomique');
  });

  it('toggleUserPremium should return success when RPC succeeds', async () => {
    const serviceClient = {
      rpc: vi.fn(async () => ({
        data: { success: true, businesses_updated: 2, business_ids: ['b1', 'b2'] },
        error: null,
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserPremium('user-1', 'gold', 3);

    expect(result.status).toBe('success');
    expect(result.message).toContain('activé');
    expect(logAuditAction).toHaveBeenCalled();
  });

  it('toggleUserPremium should still succeed when audit logging fails', async () => {
    const serviceClient = {
      rpc: vi.fn(async () => ({
        data: { success: true, businesses_updated: 1, business_ids: ['b1'] },
        error: null,
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);
    vi.mocked(logAuditAction).mockRejectedValueOnce(new Error('audit failed'));

    const result = await toggleUserPremium('user-1', 'growth', 1);

    expect(result.status).toBe('success');
    expect(result.message).toContain('activé');
  });

  it('toggleUserSuspension should block self-suspension', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-self');

    const serviceClient = {
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
              error: null,
            })),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserSuspension('admin-self', true);

    expect(result.status).toBe('error');
    expect(result.message).toContain('propre compte');
  });

  it('deleteUserCompletely should block self-deletion', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-self');

    const serviceClient = {
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
              error: null,
            })),
          })),
        })),
      })),
      rpc: vi.fn(),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('admin-self');

    expect(result.status).toBe('error');
    expect(result.message).toContain('propre compte');
    expect(serviceClient.rpc).not.toHaveBeenCalled();
  });

  it('toggleUserSuspension should block suspending another admin', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields?: string) => {
              if (fields === 'role, admin_access_level, admin_permissions') {
                return {
                  eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                      error: null,
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { role: 'admin' },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserSuspension('target-admin', true);

    expect(result.status).toBe('error');
    expect(result.message).toContain('administrateur');
  });

  it('toggleUserSuspension should return db error when update fails', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields?: string) => {
              if (fields === 'role, admin_access_level, admin_permissions') {
                return {
                  eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                      error: null,
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { role: 'user' },
                    error: null,
                  })),
                })),
              };
            }),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({
                error: { message: 'update failed' },
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await toggleUserSuspension('user-2', true);

    expect(result.status).toBe('error');
    expect(result.message).toContain('update failed');
  });

  it('deleteUserCompletely should block deleting admin target', async () => {
    const rpcSpy = vi.fn();
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields?: string) => {
              if (fields === 'role, admin_access_level, admin_permissions') {
                return {
                  eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                      error: null,
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { role: 'admin', email: 'admin@example.com' },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        return {};
      }),
      rpc: rpcSpy,
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('admin-target');

    expect(result.status).toBe('error');
    expect(result.message).toContain('administrateur');
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('deleteUserCompletely should return db error when RPC fails', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields?: string) => {
              if (fields === 'role, admin_access_level, admin_permissions') {
                return {
                  eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                      error: null,
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { role: 'user', email: 'user@example.com' },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'rpc delete failed' },
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('user-2');

    expect(result.status).toBe('error');
    expect(result.message).toContain('rpc delete failed');
  });

  it('deleteUserCompletely should succeed and revalidate users page', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields?: string) => {
              if (fields === 'role, admin_access_level, admin_permissions') {
                return {
                  eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: { role: 'admin', admin_access_level: 'super_admin', admin_permissions: [] },
                      error: null,
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { role: 'user', email: 'user@example.com' },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(async () => ({
        data: { profile_deleted: true },
        error: null,
      })),
    };
    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await deleteUserCompletely('user-2');

    expect(result.status).toBe('success');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs');
    expect(logAuditAction).toHaveBeenCalled();
  });
});

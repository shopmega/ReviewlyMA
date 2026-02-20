import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addManualPayment,
  rejectOfflinePayment,
  verifyOfflinePayment,
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
  logAuditAction: vi.fn(async () => undefined),
}));

vi.mock('@/app/actions/email', () => ({
  sendPremiumActivationEmail: vi.fn(async () => undefined),
  sendPremiumRejectionEmail: vi.fn(async () => undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('Admin Payment Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-1');
  });

  it('verifyOfflinePayment should reject non-pending payments', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'premium_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'p1', status: 'verified' },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await verifyOfflinePayment('p1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('verified');
  });

  it('verifyOfflinePayment should return error when premium RPC fails', async () => {
    const paymentUpdateEq = vi.fn(async () => ({ error: null }));
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'premium_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: 'p2',
                    status: 'pending',
                    user_id: 'u-1',
                    target_tier: 'gold',
                    business_id: 'b-1',
                    payment_reference: 'ref-1',
                    expires_at: null,
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({ eq: paymentUpdateEq })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }),
      rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc failed' } })),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await verifyOfflinePayment('p2');

    expect(result.status).toBe('error');
    expect(result.message).toContain('rpc failed');
    expect(paymentUpdateEq).toHaveBeenCalledWith('id', 'p2');
  });

  it('rejectOfflinePayment should update status and write audit log', async () => {
    const paymentUpdateEq = vi.fn(async () => ({ error: null }));
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'premium_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'p3', status: 'pending', user_id: 'u-9' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({ eq: paymentUpdateEq })),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { email: 'u9@example.com', full_name: 'User Nine' },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await rejectOfflinePayment('p3', 'invalid proof');

    expect(result.status).toBe('success');
    expect(paymentUpdateEq).toHaveBeenCalledWith('id', 'p3');
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REJECT_OFFLINE_PAYMENT',
        targetId: 'p3',
      })
    );
  });

  it('addManualPayment should create payment then sync premium and revalidate', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'u-2', business_id: 'b-2', full_name: 'User Two' },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'premium_payments') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'pay-2' },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      }),
      rpc: vi.fn(async () => ({ data: { success: true }, error: null })),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await addManualPayment({
      userEmail: 'user2@example.com',
      amount: 499,
      reference: 'MANUAL-REF-1',
      method: 'bank_transfer',
      expirationDate: '2027-02-20T00:00:00.000Z',
      tier: 'gold',
      notes: 'ok',
    });

    expect(result.status).toBe('success');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/paiements');
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADD_MANUAL_PAYMENT',
        targetId: 'pay-2',
      })
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toggleSalaryAlertSubscription } from '../salary-alerts';

const revalidatePathMock = vi.fn();
const createClientMock = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => revalidatePathMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

describe('salary alert actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authentication error for unauthenticated user', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const result = await toggleSalaryAlertSubscription('company', { businessId: 'biz-1' }, '/salaires');
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/connecte/i);
  });

  it('returns invalid target error when role_city is incomplete', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const result = await toggleSalaryAlertSubscription('role_city', { roleSlug: 'dev' }, '/salaires');
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/invalide/i);
  });

  it('enforces max 50 subscriptions cap', async () => {
    const existingQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const countQuery = {
      eq: vi.fn().mockResolvedValue({ count: 50, error: null }),
    };

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(existingQuery),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(countQuery),
      });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: fromMock,
    });

    const result = await toggleSalaryAlertSubscription('company', { businessId: 'biz-1' }, '/salaires');
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/50/);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});


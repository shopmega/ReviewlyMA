import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();
const createServiceClientMock = vi.fn();
const checkRateLimitMock = vi.fn();
const getSiteSettingsMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
  createServiceClient: () => createServiceClientMock(),
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  RATE_LIMIT_CONFIG: { review: { windowMs: 60000, maxAttempts: 5 } },
}));

vi.mock('@/lib/data', () => ({
  getSiteSettings: (...args: unknown[]) => getSiteSettingsMock(...args),
}));

import { moderateSalary, submitSalary } from '../salary';

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe('salary actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockResolvedValue({ isLimited: false, retryAfterSeconds: 0 });
    getSiteSettingsMock.mockResolvedValue({
      salary_roles: ['Software Engineer'],
      salary_departments: ['Engineering'],
      salary_intervals: [{ id: 'r1', min: 5000, max: 20000 }],
    });
  });

  it('submitSalary rejects unauthenticated users', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const result = await submitSalary({ status: 'idle', message: '' }, makeFormData({}));

    expect(result.status).toBe('error');
    expect(result.message).toContain('connect');
  });

  it('submitSalary rejects job titles not allowed by settings', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
    });

    const result = await submitSalary(
      { status: 'idle', message: '' },
      makeFormData({
        businessId: 'biz-1',
        jobTitle: 'Forbidden Role',
        salary: '10000',
        payPeriod: 'monthly',
        employmentType: 'full_time',
        isCurrent: 'true',
      })
    );

    expect(result.status).toBe('error');
    expect(result.message).toContain('Poste invalide');
  });

  it('submitSalary blocks when rate limited', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ isLimited: true, retryAfterSeconds: 180 });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
    });

    const result = await submitSalary(
      { status: 'idle', message: '' },
      makeFormData({
        businessId: 'biz-1',
        jobTitle: 'Software Engineer',
        salary: '10000',
        payPeriod: 'monthly',
        employmentType: 'full_time',
        isCurrent: 'true',
      })
    );

    expect(result.status).toBe('error');
    expect(result.message).toContain('Trop de tentatives');
  });

  it('submitSalary inserts normalized payload and revalidates on success', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { city: 'Casablanca' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'salaries') {
          return { insert: insertMock };
        }
        return { select: vi.fn() };
      }),
    });

    const result = await submitSalary(
      { status: 'idle', message: '' },
      makeFormData({
        businessId: 'biz-1',
        jobTitle: 'Software Engineer',
        salary: '12000',
        payPeriod: 'monthly',
        employmentType: 'full_time',
        department: 'Engineering',
        yearsExperience: '3',
        isCurrent: 'true',
      })
    );

    expect(result.status).toBe('success');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: 'biz-1',
        user_id: 'u-1',
        location: 'Casablanca',
        seniority_level: 'confirme',
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/businesses/biz-1');
  });

  it('submitSalary returns error when salary insert fails', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } });
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { city: 'Casablanca' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'salaries') {
          return { insert: insertMock };
        }
        return { select: vi.fn() };
      }),
    });

    const result = await submitSalary(
      { status: 'idle', message: '' },
      makeFormData({
        businessId: 'biz-1',
        jobTitle: 'Software Engineer',
        salary: '12000',
        payPeriod: 'monthly',
        employmentType: 'full_time',
        isCurrent: 'true',
      })
    );

    expect(result.status).toBe('error');
  });

  it('moderateSalary rejects non-admin users', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-2' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role: 'pro' }, error: null }),
          })),
        })),
      })),
    });

    const result = await moderateSalary(1, 'published');

    expect(result.status).toBe('error');
    expect(result.message).toContain('administrateurs');
  });

  it('moderateSalary allows admin to reject salary', async () => {
    const serviceFromMock = vi.fn((table: string) => {
      if (table === 'salaries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { business_id: 'biz-1', user_id: 'u-5' }, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      return {};
    });

    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          })),
        })),
      })),
    });
    createServiceClientMock.mockResolvedValue({
      from: serviceFromMock,
    });

    const result = await moderateSalary(12, 'rejected', 'invalid source');

    expect(result.status).toBe('success');
    expect(revalidatePathMock).toHaveBeenCalledWith('/businesses/biz-1');
  });

  it('moderateSalary returns not found when salary does not exist', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          })),
        })),
      })),
    });
    createServiceClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          })),
        })),
      })),
    });

    const result = await moderateSalary(999, 'rejected');

    expect(result.status).toBe('error');
    expect(result.message).toContain('introuvable');
  });
});

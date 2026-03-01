import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const createAuthClientMock = vi.fn(async () => ({
  auth: { getUser: getUserMock },
}));

const pendingLimitMock = vi.fn();
const pendingEqStatusMock = vi.fn(() => ({ limit: pendingLimitMock }));
const pendingEqUserMock = vi.fn(() => ({ eq: pendingEqStatusMock }));
const pendingSelectMock = vi.fn(() => ({ eq: pendingEqUserMock }));

const profileMaybeSingleMock = vi.fn();
const profileEqMock = vi.fn(() => ({ maybeSingle: profileMaybeSingleMock }));
const profileSelectMock = vi.fn(() => ({ eq: profileEqMock }));

const insertMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === 'premium_payments') {
    return {
      select: pendingSelectMock,
      insert: insertMock,
    };
  }
  if (table === 'profiles') {
    return {
      select: profileSelectMock,
    };
  }
  return { select: vi.fn(), insert: vi.fn() };
});

const createAdminClientMock = vi.fn(async () => ({ from: fromMock }));
const notifyAdminsMock = vi.fn(async () => undefined);

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createAuthClientMock(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}));
vi.mock('@/lib/notifications', () => ({
  notifyAdmins: (...args: unknown[]) => notifyAdminsMock(...args),
}));

import { POST } from '../route';

describe('premium-payments route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'u1@example.com' } },
      error: null,
    });
    pendingLimitMock.mockResolvedValue({ data: [], error: null });
    profileMaybeSingleMock.mockResolvedValue({ data: { business_id: 'biz-1' }, error: null });
    insertMock.mockResolvedValue({ error: null });
  });

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: { message: 'expired' } });
    const response = await POST(new Request('https://example.com/api/premium-payments', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when payment reference is empty', async () => {
    const response = await POST(
      new Request('https://example.com/api/premium-payments', {
        method: 'POST',
        body: JSON.stringify({ payment_reference: '   ' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 409 when pending payment already exists', async () => {
    pendingLimitMock.mockResolvedValueOnce({ data: [{ id: 'p1' }], error: null });
    const response = await POST(
      new Request('https://example.com/api/premium-payments', {
        method: 'POST',
        body: JSON.stringify({ payment_reference: 'REF-1' }),
      })
    );
    expect(response.status).toBe(409);
  });

  it('returns 400 when insert fails', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'insert failed', code: '23505' } });
    const response = await POST(
      new Request('https://example.com/api/premium-payments', {
        method: 'POST',
        body: JSON.stringify({ payment_reference: 'REF-2' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns ok and notifies admins on success', async () => {
    const response = await POST(
      new Request('https://example.com/api/premium-payments', {
        method: 'POST',
        body: JSON.stringify({ payment_reference: 'REF-3', target_tier: 'gold' }),
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(insertMock).toHaveBeenCalled();
    expect(notifyAdminsMock).toHaveBeenCalled();
  });
});

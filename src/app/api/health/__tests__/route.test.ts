import { beforeEach, describe, expect, it, vi } from 'vitest';

const singleMock = vi.fn();
const limitMock = vi.fn(() => ({ single: singleMock }));
const eqMock = vi.fn(() => ({ limit: limitMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createClientMock = vi.fn(async () => ({ from: fromMock }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

import { GET } from '../route';

describe('health route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockResolvedValue({ error: null });
  });

  it('returns 200 healthy when db check succeeds', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('healthy');
    expect(json.checks.database).toBe('ok');
    expect(typeof json.checks.responseTime).toBe('number');
    expect(fromMock).toHaveBeenCalledWith('site_settings');
  });

  it('returns 503 degraded when db check returns error', async () => {
    singleMock.mockResolvedValueOnce({ error: { message: 'db down' } });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe('degraded');
    expect(json.checks.database).toBe('error');
  });

  it('returns 503 unhealthy when createClient throws', async () => {
    createClientMock.mockRejectedValueOnce(new Error('boom'));

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe('unhealthy');
    expect(json.checks.database).toBe('error');
  });
});

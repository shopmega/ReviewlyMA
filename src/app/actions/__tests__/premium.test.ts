import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();
const createServerClientMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => cookiesMock(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

import {
  addBusinessToUser,
  getUserBusinesses,
  getUserPremiumStatus,
  removeBusinessFromUser,
  setPrimaryBusiness,
} from '../premium';

function createPremiumUsersQuery(result: { data: any; error?: any }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null }),
        })),
      })),
    })),
  };
}

function createProfilesQuery(result: { data: any; error?: any }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null }),
      })),
    })),
  };
}

describe('premium actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      getAll: () => [],
      setAll: vi.fn(),
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns active premium status from legacy premium_users', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({
            data: {
              max_businesses: 2,
              subscription_tier: 'growth',
              subscription_expires_at: '2099-01-01T00:00:00.000Z',
            },
          });
        }
        return createProfilesQuery({ data: null });
      }),
    });

    const result = await getUserPremiumStatus('user-1');

    expect(result.isPremium).toBe(true);
    expect(result.subscriptionTier).toBe('growth');
    expect(result.maxBusinesses).toBe(1);
  });

  it('returns standard when legacy premium_users subscription is expired', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({
            data: {
              max_businesses: 1,
              subscription_tier: 'gold',
              subscription_expires_at: '2020-01-01T00:00:00.000Z',
            },
          });
        }
        return createProfilesQuery({ data: null });
      }),
    });

    const result = await getUserPremiumStatus('user-1');

    expect(result.isPremium).toBe(false);
    expect(result.subscriptionTier).toBe('standard');
    expect(result.maxBusinesses).toBe(1);
  });

  it('falls back to profiles tier when no premium_users row exists', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({ data: null });
        }
        if (table === 'profiles') {
          return createProfilesQuery({
            data: {
              is_premium: false,
              tier: 'gold',
              premium_expires_at: '2099-01-01T00:00:00.000Z',
            },
          });
        }
        return createProfilesQuery({ data: null });
      }),
    });

    const result = await getUserPremiumStatus('user-2');

    expect(result.isPremium).toBe(true);
    expect(result.subscriptionTier).toBe('gold');
    expect(result.maxBusinesses).toBe(1);
  });

  it('returns standard and logs when query throws', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn(() => {
        throw new Error('db failed');
      }),
    });

    const result = await getUserPremiumStatus('user-3');

    expect(result).toEqual({
      isPremium: false,
      maxBusinesses: 1,
      subscriptionTier: 'standard',
    });
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('setPrimaryBusiness returns error when user does not manage target business', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    });

    const result = await setPrimaryBusiness('user-1', 'biz-1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('do not manage');
  });

  it('setPrimaryBusiness updates ownership flags and profile on success', async () => {
    const updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'user_businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: { id: 'link-1' }, error: null }),
                })),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              updateCalls.push({ table, payload });
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                })),
              };
            }),
          };
        }

        if (table === 'profiles') {
          return {
            update: vi.fn((payload: Record<string, unknown>) => {
              updateCalls.push({ table, payload });
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    });

    const result = await setPrimaryBusiness('user-1', 'biz-2');

    expect(result.status).toBe('success');
    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'user_businesses', payload: { is_primary: false } }),
        expect.objectContaining({ table: 'user_businesses', payload: { is_primary: true } }),
        expect.objectContaining({ table: 'profiles', payload: { business_id: 'biz-2' } }),
      ])
    );
  });

  it('removeBusinessFromUser blocks deletion of primary business', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { is_primary: true },
                error: null,
              }),
            })),
          })),
        })),
      })),
    });

    const result = await removeBusinessFromUser('user-1', 'biz-1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Cannot remove primary business');
  });

  it('removeBusinessFromUser deletes non-primary business', async () => {
    const deleteMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));

    createServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { is_primary: false },
                error: null,
              }),
            })),
          })),
        })),
        delete: deleteMock,
      })),
    });

    const result = await removeBusinessFromUser('user-1', 'biz-9');

    expect(result.status).toBe('success');
    expect(deleteMock).toHaveBeenCalled();
  });

  it('getUserBusinesses falls back to profiles.business_id when user_businesses is empty', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({ data: null });
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { is_premium: false, tier: 'standard', business_id: 'biz-legacy' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'user_businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'biz-legacy',
                    name: 'Legacy Biz',
                    overall_rating: 4.2,
                    reviews: [{ count: 12 }],
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    });

    const result = await getUserBusinesses('user-legacy');

    expect(result.currentCount).toBe(1);
    expect(result.businesses[0]).toEqual(
      expect.objectContaining({
        id: 'biz-legacy',
        name: 'Legacy Biz',
        role: 'owner',
        isPrimary: true,
      })
    );
  });

  it('addBusinessToUser returns limit error before duplicate check when already at cap', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({
            data: {
              max_businesses: 1,
              subscription_tier: 'gold',
              subscription_expires_at: '2099-01-01T00:00:00.000Z',
            },
          });
        }
        if (table === 'user_businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    business_id: 'biz-dup',
                    role: 'owner',
                    is_primary: true,
                    businesses: { name: 'Dup Biz', overall_rating: 0, reviews: [{ count: 0 }] },
                  },
                ],
                error: null,
              }),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'profiles') {
          return createProfilesQuery({ data: { is_premium: false, tier: 'standard' } });
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    });

    const result = await addBusinessToUser('user-1', 'biz-dup');

    expect(result.status).toBe('error');
    expect(result.message).toContain('Business limit reached');
  });

  it('addBusinessToUser inserts and updates profile when adding first business', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const profileUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({
            data: {
              max_businesses: 1,
              subscription_tier: 'gold',
              subscription_expires_at: '2099-01-01T00:00:00.000Z',
            },
          });
        }
        if (table === 'user_businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: insertMock,
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { is_premium: false, tier: 'standard' }, error: null }),
              })),
            })),
            update: profileUpdateMock,
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    });

    const result = await addBusinessToUser('user-1', 'biz-new');

    expect(result.status).toBe('success');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      business_id: 'biz-new',
      role: 'owner',
      is_primary: true,
    });
    expect(profileUpdateMock).toHaveBeenCalledWith({
      business_id: 'biz-new',
      role: 'pro',
    });
  });

  it('addBusinessToUser returns insert error when link creation fails', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } });

    createServerClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'premium_users') {
          return createPremiumUsersQuery({
            data: {
              max_businesses: 1,
              subscription_tier: 'gold',
              subscription_expires_at: '2099-01-01T00:00:00.000Z',
            },
          });
        }
        if (table === 'user_businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: insertMock,
          };
        }
        if (table === 'profiles') {
          return createProfilesQuery({ data: { is_premium: false, tier: 'standard' } });
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    });

    const result = await addBusinessToUser('user-1', 'biz-fail');

    expect(result.status).toBe('error');
    expect(result.message).toContain('insert failed');
  });

  it('getUserBusinesses returns safe fallback on unexpected exception', async () => {
    createServerClientMock.mockReturnValue({
      from: vi.fn(() => {
        throw new Error('unexpected');
      }),
    });

    const result = await getUserBusinesses('user-err');

    expect(result).toEqual({
      businesses: [],
      canAddMore: false,
      currentCount: 0,
      maxAllowed: 1,
    });
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});

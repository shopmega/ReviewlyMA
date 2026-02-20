import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAdminUsersWithClaims,
  getAdminPendingClaims,
  getAdminBusinessesByRating,
} from '../admin-queries';

const mockCreateServerClient = vi.fn();
const mockCookiesGetAll = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: mockCookiesGetAll,
    set: mockCookiesSet,
  })),
}));

describe('Admin Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGetAll.mockReturnValue([]);
  });

  it('getAdminUsersWithClaims maps joined profile rows', async () => {
    const rows = [
      {
        id: 'u1',
        email: 'u1@example.com',
        full_name: 'User One',
        role: 'user',
        business_id: 'b1',
        is_premium: true,
        created_at: '2026-01-01',
        business_claims: [{ status: 'approved', businesses: { name: 'Biz One' } }],
      },
    ];

    const range = vi.fn().mockResolvedValue({ data: rows, count: 1, error: null });
    const order = vi.fn(() => ({ range }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    mockCreateServerClient.mockReturnValue({ from });

    const result = await getAdminUsersWithClaims(10, 0);

    expect(result.total).toBe(1);
    expect(result.users[0]).toMatchObject({
      userId: 'u1',
      email: 'u1@example.com',
      fullName: 'User One',
      businessName: 'Biz One',
      claimStatus: 'approved',
    });
  });

  it('getAdminPendingClaims maps claim rows', async () => {
    const rows = [
      {
        id: 'c1',
        user_id: 'u1',
        full_name: 'User One',
        email: 'fallback@example.com',
        status: 'pending',
        proof_methods: ['document'],
        created_at: '2026-01-01',
        businesses: { id: 'b1', name: 'Biz One' },
        profiles: { email: 'u1@example.com' },
      },
    ];

    const range = vi.fn().mockResolvedValue({ data: rows, count: 1, error: null });
    const order = vi.fn(() => ({ range }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateServerClient.mockReturnValue({ from });

    const result = await getAdminPendingClaims(10, 0);

    expect(result.total).toBe(1);
    expect(result.claims[0]).toMatchObject({
      claimId: 'c1',
      userId: 'u1',
      userEmail: 'u1@example.com',
      businessName: 'Biz One',
    });
  });

  it('getAdminBusinessesByRating maps business rows', async () => {
    const rows = [
      {
        id: 'b1',
        name: 'Biz One',
        category: 'Restaurant',
        overall_rating: 4.6,
        is_premium: true,
        reviews: [{ id: 1 }, { id: 2 }],
      },
    ];

    const range = vi.fn().mockResolvedValue({ data: rows, count: 1, error: null });
    const order = vi.fn(() => ({ range }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    mockCreateServerClient.mockReturnValue({ from });

    const result = await getAdminBusinessesByRating(10, 0);

    expect(result.total).toBe(1);
    expect(result.businesses[0]).toMatchObject({
      businessId: 'b1',
      businessName: 'Biz One',
      reviewCount: 2,
      averageRating: 4.6,
    });
  });
});

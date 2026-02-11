import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getAdminUsersWithClaims,
  getAdminPendingClaims,
  getAdminBusinessesByRating
} from '../admin-queries';

// Mock the server client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => {
    const mockSelectQuery = {
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        limit: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        }))
      })),
      neq: vi.fn(() => ({
        delete: vi.fn(() => Promise.resolve({ error: null }))
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        }))
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        }))
      })),
      limit: vi.fn(() => ({
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
      })),
      range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
      // Note: Removed duplicate 'order' property that would conflict with the 'order' method above
    };
    
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => mockSelectQuery),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        upsert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        })),
      })),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: vi.fn(() => [vi.fn(), vi.fn()]),
      },
    };
  })
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    setAll: vi.fn(),
  })),
}));

describe('Admin Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAdminUsersWithClaims', () => {
    it('should fetch users with their claim data', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          full_name: 'User One',
          role: 'user',
          is_premium: false,
          created_at: '2023-01-01',
          business_claims: [{
            status: 'pending',
            business_id: 'biz1',
            businesses: { name: 'Business One' }
          }]
        }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: mockUsers, count: 1, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminUsersWithClaims();

      expect(result).toEqual({
        users: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            fullName: 'User One',
            role: 'user',
            businessId: 'biz1',
            businessName: 'Business One',
            claimStatus: 'pending',
            isPremium: false,
            createdAt: '2023-01-01'
          }
        ],
        total: 1
      });
    });

    it('should handle error when fetching users', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: null, count: 0, error: { message: 'Database error' } }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminUsersWithClaims();

      expect(result).toEqual({ users: [], total: 0 });
    });

    it('should handle unexpected error', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => {
                throw new Error('Unexpected error');
              })
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminUsersWithClaims();

      expect(result).toEqual({ users: [], total: 0 });
    });
  });

  describe('getAdminPendingClaims', () => {
    it('should fetch pending claims with business data', async () => {
      const mockClaims = [
        {
          id: 'claim1',
          user_id: 'user1',
          full_name: 'User One',
          email: 'user1@example.com',
          status: 'pending',
          proof_methods: ['document'],
          created_at: '2023-01-01',
          businesses: { name: 'Business One', id: 'biz1' },
          profiles: { email: 'user1@example.com' }
        }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockClaims, count: 1, error: null }))
              }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminPendingClaims();

      expect(result).toEqual({
        claims: [
          {
            claimId: 'claim1',
            userId: 'user1',
            userName: 'User One',
            userEmail: 'user1@example.com',
            businessName: 'Business One',
            businessId: 'biz1',
            status: 'pending',
            createdAt: '2023-01-01',
            proofMethods: ['document']
          }
        ],
        total: 1
      });
    });

    it('should handle error when fetching pending claims', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: null, count: 0, error: { message: 'Database error' } }))
              }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminPendingClaims();

      expect(result).toEqual({ claims: [], total: 0 });
    });

    it('should handle unexpected error', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => {
                  throw new Error('Unexpected error');
                })
              }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminPendingClaims();

      expect(result).toEqual({ claims: [], total: 0 });
    });
  });

  describe('getAdminBusinessesByRating', () => {
    it('should fetch businesses ordered by rating', async () => {
      const mockBusinesses = [
        {
          id: 'biz1',
          name: 'Business One',
          category: 'Restaurant',
          overall_rating: 4.5,
          is_premium: true,
          reviews: [{ count: 10 }]
        }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: mockBusinesses, count: 1, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminBusinessesByRating();

      expect(result).toEqual({
        businesses: [
          {
            businessId: 'biz1',
            businessName: 'Business One',
            reviewCount: 1,
            averageRating: 4.5,
            totalRatings: 1,
            categoryName: 'Restaurant',
            isPremium: true
          }
        ],
        total: 1
      });
    });

    it('should handle error when fetching businesses by rating', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: null, count: 0, error: { message: 'Database error' } }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminBusinessesByRating();

      expect(result).toEqual({ businesses: [], total: 0 });
    });

    it('should handle unexpected error', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => {
                throw new Error('Unexpected error');
              })
            }))
          }))
        }))
      };
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase);

      const result = await getAdminBusinessesByRating();

      expect(result).toEqual({ businesses: [], total: 0 });
    });
  });
});
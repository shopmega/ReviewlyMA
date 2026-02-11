import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getFilteredBusinesses,
  getBusinesses,
  getAllCategories,
  getBusinessReviews,
  getBusinessById,
  getFeaturedBusinesses,
  getBusinessHours
} from '../data/businesses';

// Mock the Supabase client
vi.mock('../supabase/client', () => ({
  createClient: vi.fn(() => ({
    supabaseUrl: 'test-url',
    supabaseKey: 'test-key',
    realtime: {
      channel: vi.fn()
    },
    storage: {
      from: vi.fn()
    },
    from: vi.fn((table: string) => {
      if (table === 'businesses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ 
                    data: [
                      { id: '1', name: 'Featured Business 1', is_featured: true },
                      { id: '2', name: 'Featured Business 2', is_featured: true }
                    ], 
                    error: null, 
                    count: 2 
                  }))
                }))
              }))
            })),
            ilike: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
                }))
              }))
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
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'biz1', name: 'Test Business' }, 
              error: null 
            }))
          }))
        };
      }
      if (table === 'categories') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: [
                { id: 'cat1', name: 'Restaurant', slug: 'restaurant' },
                { id: 'cat2', name: 'Hotel', slug: 'hotel' }
              ], 
              error: null 
            }))
          }))
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [
                    { id: 1, rating: 5, comment: 'Great place!' },
                    { id: 2, rating: 4, comment: 'Good service' }
                  ], 
                  error: null 
                }))
              }))
            }))
          }))
        };
      }
      if (table === 'saved_businesses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            limit: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
              }))
            })),
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
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          upsert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { 
          user: { 
            id: 'admin-user-id',
            email: 'th3mazze@gmail.com'
          } 
        }, 
        error: null 
      })),
      signInWithPassword: vi.fn(() => Promise.resolve({ 
        data: { 
          user: { 
            id: 'admin-user-id',
            email: 'th3mazze@gmail.com'
          } 
        }, 
        error: null 
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => [vi.fn(), vi.fn()]),
    },
  }))
}));

describe('Data Fetching Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFilteredBusinesses', () => {
    it('should fetch businesses with filters', async () => {
      const filters = {
        category: 'Restaurant',
        city: 'Paris',
        page: 1,
        limit: 10
      };
      const mockBusinesses = [
        { id: '1', name: 'Test Restaurant', category: 'Restaurant', city: 'Paris' }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        range: vi.fn(() => Promise.resolve({ 
                          data: mockBusinesses, 
                          error: null, 
                          count: 1 
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getFilteredBusinesses(filters);

      expect(result).toEqual({
        businesses: mockBusinesses,
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      });
    });

    it('should handle error when fetching businesses', async () => {
      const filters = { category: 'Restaurant' };
      
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      range: vi.fn(() => Promise.resolve({ 
                        data: null, 
                        error: { message: 'Database error' }, 
                        count: 0 
                      }))
                    }))
                  }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getFilteredBusinesses(filters);

      expect(result).toEqual({
        businesses: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      });
    });
  });

  describe('getBusinesses', () => {
    it('should fetch all businesses', async () => {
      const mockBusinesses = [
        { id: '1', name: 'Business 1' },
        { id: '2', name: 'Business 2' }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getBusinesses();

      expect(result).toEqual(mockBusinesses);
    });
  });

  describe('getAllCategories', () => {
    it('should fetch all categories', async () => {
      const mockCategories = [
        { id: 'cat1', name: 'Restaurant', slug: 'restaurant' },
        { id: 'cat2', name: 'Hotel', slug: 'hotel' }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'categories') {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockCategories, error: null }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getAllCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('getBusinessReviews', () => {
    it('should fetch business reviews', async () => {
      const businessId = 'biz1';
      const mockReviews = [
        { id: 1, rating: 5, comment: 'Great place!' },
        { id: 2, rating: 4, comment: 'Good service' }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'reviews') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: mockReviews, error: null }))
                  }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getBusinessReviews(businessId);

      expect(result).toEqual(mockReviews);
    });
  });

  describe('getBusinessById', () => {
    it('should fetch business by id', async () => {
      const businessId = 'biz1';
      const mockBusiness = { id: businessId, name: 'Test Business' };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockBusiness, error: null }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getBusinessById(businessId);

      expect(result).toEqual(mockBusiness);
    });

    it('should return null when business not found', async () => {
      const businessId = 'nonexistent';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getBusinessById(businessId);

      expect(result).toBeNull();
    });
  });

  describe('getFeaturedBusinesses', () => {
    it('should fetch featured businesses', async () => {
      const mockBusinesses = [
        { id: '1', name: 'Featured Business 1', is_featured: true },
        { id: '2', name: 'Featured Business 2', is_featured: true }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null }))
                  }))
                }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getFeaturedBusinesses();

      expect(result).toEqual(mockBusinesses);
    });
  });

  describe('getBusinessHours', () => {
    it('should fetch business hours', async () => {
      const businessId = 'biz1';
      const mockHours = [
        { day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false },
        { day_of_week: 2, open_time: '09:00', close_time: '17:00', is_closed: false }
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'business_hours') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: mockHours, error: null }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        })
      };

      const { createClient } = await import('../supabase/client');
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await getBusinessHours(businessId);

      expect(result).toEqual(mockHours);
    });
  });
});

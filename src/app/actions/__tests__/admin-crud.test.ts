import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  fetchAllUsers,
  changeUserRole,
  createBusiness,
  deleteBusiness,
  fetchPremiumPayments
} from '../admin';
import { updateClaimStatus } from '../claim-admin';

// Mock the admin client and other dependencies
vi.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
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
    })),
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
  })),
  verifyAdminSession: vi.fn(() => Promise.resolve('admin-user-id')),
}));

vi.mock('../../../lib/audit-logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

describe('Admin CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAllUsers', () => {
    it('should fetch all users', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@example.com', role: 'user' },
        { id: 'user2', email: 'user2@example.com', role: 'pro' }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockUsers, error: null }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await fetchAllUsers();

      expect(result).toEqual({
        status: 'success',
        data: mockUsers
      });
    });
  });

  describe('changeUserRole', () => {
    it('should update user role successfully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ id: 'user1', role: 'admin' }], error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'user1', role: 'admin' }, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await changeUserRole('user1', 'admin');

      expect(result).toEqual({
        status: 'success',
        message: 'Rôle utilisateur mis à jour avec succès.',
        data: { id: 'user1', role: 'admin' }
      });
    });

    it('should handle error when updating user role', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Update error' } }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await changeUserRole('user1', 'admin');

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur mise à jour rôle utilisateur: Update error'
      });
    });
  });

  describe('createBusiness', () => {
    it('should create a business successfully', async () => {
      const businessData = {
        name: 'Test Business',
        category: 'Restaurant',
        city: 'Paris',
        address: '123 Test Street'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ data: [{ id: 'biz1', ...businessData }], error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'biz1', ...businessData }, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await createBusiness(businessData);

      expect(result).toEqual({
        status: 'success',
        message: 'Business créé avec succès.',
        data: { id: 'biz1', ...businessData }
      });
    });

    it('should handle error when creating business', async () => {
      const businessData = {
        name: 'Test Business',
        category: 'Restaurant',
        city: 'Paris',
        address: '123 Test Street'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Insert error' } }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await createBusiness(businessData);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur création business: Insert error'
      });
    });
  });

  describe('deleteBusiness', () => {
    it('should delete a business successfully', async () => {
      const businessId = 'biz1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: 'Test Business' }, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await deleteBusiness(businessId);

      expect(result).toEqual({
        status: 'success',
        message: 'Business supprimé avec succès.'
      });
    });

    it('should handle error when deleting business', async () => {
      const businessId = 'biz1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete error' } }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await deleteBusiness(businessId);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur suppression business: Delete error'
      });
    });
  });

  describe('updateClaimStatus', () => {
    it('should approve a claim successfully', async () => {
      const claimId = 'claim1';
      const mockClaim = {
        id: claimId,
        user_id: 'user1',
        business_id: 'biz1',
        status: 'pending'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ ...mockClaim, status: 'approved' }], error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { ...mockClaim, status: 'approved' }, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await updateClaimStatus(claimId, 'approved');

      expect(result).toEqual({
        status: 'success',
        message: 'Claim approved successfully'
      });
    });

    it('should reject a claim successfully', async () => {
      const claimId = 'claim1';
      const mockClaim = {
        id: claimId,
        user_id: 'user1',
        business_id: 'biz1',
        status: 'pending'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ ...mockClaim, status: 'rejected' }], error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { ...mockClaim, status: 'rejected' }, error: null }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await updateClaimStatus(claimId, 'rejected');

      expect(result).toEqual({
        status: 'success',
        message: 'Claim rejected successfully'
      });
    });

    it('should handle error when updating claim', async () => {
      const claimId = 'claim1';
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Update error' } }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await updateClaimStatus(claimId, 'approved');

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur mise à jour claim: Update error'
      });
    });
  });

  describe('fetchPremiumPayments', () => {
    it('should fetch premium payments', async () => {
      const mockPayments = [
        { id: 'pay1', user_id: 'user1', amount: 100, status: 'completed' },
        { id: 'pay2', user_id: 'user2', amount: 200, status: 'pending' }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: mockPayments, error: null, count: 2 }))
              }))
            }))
          }))
        }))
      };
      
      vi.mocked(require('../../../lib/supabase/admin').createAdminClient).mockReturnValue(mockSupabase);

      const result = await fetchPremiumPayments();

      expect(result).toEqual({
        status: 'success',
        data: mockPayments
      });
    });
  });
});
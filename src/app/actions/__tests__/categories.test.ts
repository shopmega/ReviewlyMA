import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getCategories as getAllCategories,
  getSubcategories,
  upsertCategory,
  deleteCategory,
  upsertSubcategory,
  deleteSubcategory
} from '../categories';

// Mock the admin client and other dependencies
vi.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table) => {
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
          })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: {
                  id: 'cat3', 
                  name: 'New Category', 
                  slug: 'new-category', 
                  description: 'A new category'
                }, 
                error: null 
              }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null,
                error: { message: 'Delete error' }
              }))
            }))
          }))
        };
      }
      if (table === 'subcategories') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: [
                  { id: 'sub1', name: 'Fast Food', category_id: 'cat1' },
                  { id: 'sub2', name: 'Fine Dining', category_id: 'cat1' }
                ], 
                error: null 
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: {
                  id: 'sub3', 
                  name: 'New Subcategory', 
                  category_id: 'cat1', 
                  description: 'A new subcategory'
                }, 
                error: null 
              }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null,
                error: { message: 'Delete error' }
              }))
            }))
          }))
        };
      }
      // Default fallback for other tables
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'cat3', name: 'New Category', slug: 'new-category', description: 'A new category' }, 
              error: null 
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      };
    })
  })),
  verifyAdminSession: vi.fn(() => Promise.resolve('mock-admin-id')),
}));

vi.mock('../../../lib/audit-logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve())
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Category CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllCategories', () => {
    it('should fetch all categories', async () => {
      const mockCategories = [
        { id: 'cat1', name: 'Restaurant', slug: 'restaurant' },
        { id: 'cat2', name: 'Hotel', slug: 'hotel' }
      ];
      
      // The module is already mocked at the top level, so the function will use the mock automatically
      const result = await getAllCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('getSubcategories', () => {
    it('should fetch subcategories for a category', async () => {
      const categoryId = 'cat1';
      const mockSubcategories = [
        { id: 'sub1', name: 'Fast Food', category_id: categoryId },
        { id: 'sub2', name: 'Fine Dining', category_id: categoryId }
      ];
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockSubcategories, error: null }))
            }))
          }))
        }))
      };
      
      

      const result = await getSubcategories(categoryId);

      expect(result).toEqual(mockSubcategories);
    });
  });

  describe('upsertCategory', () => {
    it('should create a category successfully', async () => {
      const categoryData = {
        name: 'New Category',
        slug: 'new-category',
        description: 'A new category'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ data: [{ id: 'cat3', ...categoryData }], error: null })),
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'cat3', ...categoryData }, error: null }))
          }))
        }))
      };
      
      

      const result = await upsertCategory(categoryData);

      expect(result).toEqual({
        status: 'success',
        message: 'Catégorie enregistrée avec succès.',
        data: { id: 'cat3', ...categoryData }
      });
    });

    it('should handle error when creating category', async () => {
      const categoryData = {
        name: 'New Category',
        slug: 'new-category'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Insert error' } }))
        }))
      };
      
      

      const result = await upsertCategory(categoryData);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Insert error'
      });
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const categoryId = 'cat1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: 'Restaurant' }, error: null }))
            }))
          }))
        }))
      };
      
      

      const result = await deleteCategory(categoryId);

      expect(result).toEqual({
        status: 'success',
        message: 'Catégorie supprimée avec succès.'
      });
    });

    it('should handle error when deleting category', async () => {
      const categoryId = 'cat1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete error' } }))
          }))
        }))
      };
      
      

      const result = await deleteCategory(categoryId);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Delete error'
      });
    });
  });

  describe('upsertSubcategory', () => {
    it('should create a subcategory successfully', async () => {
      const subcategoryData = {
        name: 'New Subcategory',
        category_id: 'cat1',
        description: 'A new subcategory'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ data: [{ id: 'sub3', ...subcategoryData }], error: null })),
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'sub3', ...subcategoryData }, error: null }))
          }))
        }))
      };
      
      

      const result = await upsertSubcategory(subcategoryData);

      expect(result).toEqual({
        status: 'success',
        message: 'Sous-catégorie enregistrée avec succès.',
        data: { id: 'sub3', ...subcategoryData }
      });
    });

    it('should handle error when creating subcategory', async () => {
      const subcategoryData = {
        name: 'New Subcategory',
        category_id: 'cat1'
      };
      const mockSupabase = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Insert error' } }))
        }))
      };
      
      

      const result = await upsertSubcategory(subcategoryData);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Insert error'
      });
    });
  });

  describe('deleteSubcategory', () => {
    it('should delete a subcategory successfully', async () => {
      const subcategoryId = 'sub1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: 'Fast Food' }, error: null }))
            }))
          }))
        }))
      };
      
      

      const result = await deleteSubcategory(subcategoryId);

      expect(result).toEqual({
        status: 'success',
        message: 'Sous-catégorie supprimée avec succès.'
      });
    });

    it('should handle error when deleting subcategory', async () => {
      const subcategoryId = 'sub1';
      const mockSupabase = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete error' } }))
          }))
        }))
      };
      
      

      const result = await deleteSubcategory(subcategoryId);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Delete error'
      });
    });
  });
});

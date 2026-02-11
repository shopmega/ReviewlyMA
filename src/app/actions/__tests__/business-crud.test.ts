import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  suggestBusiness,
  reportMedia,
  submitUpdate,
  updateBusinessProfile,
  updateBusinessImagesAction,
  saveBusinessHours,
  getBusinessHours
} from '../business';

// Mock the client and other dependencies
vi.mock('../../../lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
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
    },
    from: vi.fn((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  business_id: 'biz1', 
                  role: 'admin',
                  email: 'th3mazze@gmail.com'
                }, 
                error: null 
              }))
            }))
          }))
        };
      }
      if (table === 'businesses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { name: 'Test Business' }, error: null }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        };
      }
      if (table === 'updates') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null }))
        };
      }
      if (table === 'favorites') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ user_id: 'user2' }], error: null }))
          }))
        };
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null }))
        };
      }
      if (table === 'business_hours') {
        return {
          upsert: vi.fn(() => Promise.resolve({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      }
      return {
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      };
    })
  })),
}));

vi.mock('../../../lib/supabase/admin', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    setAll: vi.fn(() => {})
  }))
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Business CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('suggestBusiness', () => {
    it('should suggest a business successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Business');
      formData.append('category', 'Restaurant');
      formData.append('city', 'Paris');
      formData.append('address', '123 Test St');
      formData.append('description', 'A great restaurant');
      formData.append('website', 'https://test.com');
      formData.append('phone', '+33123456789');

      const result = await suggestBusiness(formData);

      expect(result).toEqual({
        status: 'success',
        message: 'Merci pour votre suggestion ! Nous l\'examinerons bientôt.'
      });
    });

    it('should handle error when suggesting business', async () => {
      const formData = new FormData();
      // Missing required fields
      
      const result = await suggestBusiness(formData);

      expect(result).toEqual({
        status: 'error',
        message: 'Veuillez remplir tous les champs obligatoires.'
      });
    });
  });

  describe('reportMedia', () => {
    it('should report media successfully', async () => {
      const mockData = {
        media_url: 'https://example.com/image.jpg',
        media_type: 'image' as const,
        business_id: 'biz1',
        reason: 'inappropriate' as const,
        details: 'This image is inappropriate'
      };

      const result = await reportMedia(mockData);

      expect(result).toEqual({
        status: 'success',
        message: 'Signalement envoyé. Merci pour votre aide !'
      });
    });

    it('should handle error when reporting media', async () => {
      const mockData = {
        businessId: 'biz1',
        mediaType: 'logo'
        // Missing required reason field
      };

      const result = await reportMedia(mockData as any);

      expect(result).toEqual({
        status: 'error',
        message: 'Veuillez sélectionner une raison pour le signalement.'
      });
    });
  });

  describe('submitUpdate', () => {
    it('should submit update successfully', async () => {
      const prevState = { status: 'idle' } as any;
      const formData = new FormData();
      formData.append('updateTitle', 'New Update');
      formData.append('updateText', 'This is a test update');

      const result = await submitUpdate(prevState, formData);

      expect(result).toEqual({
        status: 'success',
        message: 'Nouveauté publiée et abonnés notifiés !'
      });
    });

    it('should handle error when submitting update', async () => {
      const prevState = { status: 'idle' } as any;
      const formData = new FormData();
      // Missing required fields

      const result = await submitUpdate(prevState, formData);

      expect(result).toEqual({
        status: 'error',
        message: 'Champs requis manquants.'
      });
    });
  });

  describe('updateBusinessProfile', () => {
    it('should update business profile successfully', async () => {
      const prevState = { status: 'idle' } as any;
      const formData = new FormData();
      formData.append('name', 'Updated Business Name');
      formData.append('description', 'Updated description');
      formData.append('phone', '+33123456789');

      const result = await updateBusinessProfile(prevState, formData);

      expect(result).toEqual({
        status: 'success',
        message: 'Profil mis à jour avec succès'
      });
    });

    it('should handle error when updating business profile', async () => {
      const prevState = { status: 'idle' } as any;
      const formData = new FormData();
      // Invalid data

      const result = await updateBusinessProfile(prevState, formData);

      expect(result.status).toBe('error');
    });
  });

  describe('updateBusinessImagesAction', () => {
    it('should update business images successfully', async () => {
      const imageData = {
        logo_url: 'https://example.com/logo.jpg',
        cover_url: 'https://example.com/cover.jpg'
      };

      const result = await updateBusinessImagesAction('biz1', imageData);

      expect(result).toEqual({
        status: 'success',
        message: 'Images mises à jour avec succès'
      });
    });

    it('should handle error when updating business images', async () => {
      const imageData = {
        logo_url: 'invalid-url'
      };

      const result = await updateBusinessImagesAction('biz1', imageData);

      expect(result.status).toBe('error');
    });
  });

  describe('saveBusinessHours', () => {
    it('should save business hours successfully', async () => {
      const hours = [
        { day: 'monday', open: '09:00', close: '17:00' },
        { day: 'tuesday', open: '09:00', close: '17:00' }
      ];
      const businessId = 'biz1';

      const result = await saveBusinessHours(hours, businessId);

      expect(result).toEqual({
        status: 'success',
        message: 'Horaires enregistrés avec succès'
      });
    });

    it('should handle error when saving business hours', async () => {
      const hours: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[] = [];
      const businessId = 'biz1';

      const result = await saveBusinessHours(hours, businessId);

      expect(result).toEqual({
        status: 'error',
        message: 'Aucun horaire fourni'
      });
    });
  });

  describe('getBusinessHours', () => {
    it('should get business hours successfully', async () => {
      const businessId = 'biz1';
      
      const result = await getBusinessHours(businessId);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  updateSiteSettings,
  toggleMaintenanceMode
} from '../admin';
import { verifyAdminSession } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath } from 'next/cache';

// Mock the admin client and other dependencies
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'site_settings') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({ data: [{ id: 'main' }], error: null }))
            }))
          }))
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
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
    },
  })),
  verifyAdminSession: vi.fn(() => Promise.resolve('admin-user-id')),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve())
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn()
}));

describe('Admin Settings Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateSiteSettings', () => {
    it('should update site settings successfully', async () => {
      const settingsData = {
        site_name: 'New Site Name',
        contact_email: 'new@example.com',
        maintenance_mode: false
      };

      const result = await updateSiteSettings(settingsData);

      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
      expect(revalidateTag).toHaveBeenCalledWith('site-settings');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle database errors when updating settings', async () => {
      // Mock database error
      const mockAdminClient = (await import('@/lib/supabase/admin')).createAdminClient;
      vi.mocked(mockAdminClient).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' }
              }))
            }))
          }))
        }))
      } as any));

      const settingsData = {
        site_name: 'Test Site'
      };

      const result = await updateSiteSettings(settingsData);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Database connection failed'
      });
    });

    it('should handle authentication errors', async () => {
      // Mock authentication failure
      vi.mocked(verifyAdminSession).mockRejectedValueOnce(new Error('Unauthorized'));

      const settingsData = {
        site_name: 'Test Site'
      };

      const result = await updateSiteSettings(settingsData);

      expect(result).toEqual({
        status: 'error',
        message: 'Unauthorized'
      });
    });
  });

  describe('toggleMaintenanceMode', () => {
    it('should reject when reason is too short', async () => {
      const result = await toggleMaintenanceMode(true, {
        reason: 'too short',
        confirmationText: 'ENABLE_MAINTENANCE'
      });

      expect(result).toEqual({
        status: 'error',
        message: 'Une raison detaillee (10+ caracteres) est obligatoire.'
      });
    });

    it('should reject when confirmation text is invalid', async () => {
      const result = await toggleMaintenanceMode(false, {
        reason: 'Retour operationnel apres verification',
        confirmationText: 'WRONG_CONFIRMATION'
      });

      expect(result).toEqual({
        status: 'error',
        message: "Confirmation invalide. Saisissez 'DISABLE_MAINTENANCE'."
      });
    });

    it('should enable maintenance mode successfully', async () => {
      const result = await toggleMaintenanceMode(true, {
        reason: 'Maintenance preventive planifiee',
        confirmationText: 'ENABLE_MAINTENANCE'
      });

      expect(result).toEqual({
        status: 'success',
        message: 'Mode maintenance ACTIVÉ'
      });
      expect(revalidateTag).toHaveBeenCalledWith('site-settings');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should disable maintenance mode successfully', async () => {
      const result = await toggleMaintenanceMode(false, {
        reason: 'Retour operationnel apres verification',
        confirmationText: 'DISABLE_MAINTENANCE'
      });

      expect(result).toEqual({
        status: 'success',
        message: 'Mode maintenance DÉSACTIVÉ'
      });
      expect(revalidateTag).toHaveBeenCalledWith('site-settings');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle database errors when toggling maintenance mode', async () => {
      // Mock database error
      const mockAdminClient = (await import('@/lib/supabase/admin')).createAdminClient;
      vi.mocked(mockAdminClient).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ 
              error: { message: 'Update failed' } 
            }))
          }))
        }))
      } as any));

      const result = await toggleMaintenanceMode(true, {
        reason: 'Maintenance preventive planifiee',
        confirmationText: 'ENABLE_MAINTENANCE'
      });

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur: Update failed'
      });
    });

    it('should handle authentication errors when toggling maintenance mode', async () => {
      // Mock authentication failure
      vi.mocked(verifyAdminSession).mockRejectedValueOnce(new Error('Access denied'));

      await expect(toggleMaintenanceMode(true, {
        reason: 'Maintenance preventive planifiee',
        confirmationText: 'ENABLE_MAINTENANCE'
      })).rejects.toThrow('Access denied');
    });
  });

  describe('Settings Validation', () => {
    it('should handle empty settings object', async () => {
      const result = await updateSiteSettings({});

      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
    });

    it('should handle partial settings updates', async () => {
      const partialSettings = {
        site_name: 'Updated Name Only'
      };

      const result = await updateSiteSettings(partialSettings);

      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
    });

    it('should properly handle boolean settings', async () => {
      const booleanSettings = {
        maintenance_mode: true,
        allow_new_registrations: false,
        require_email_verification: true
      };

      const result = await updateSiteSettings(booleanSettings);

      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
    });

    it('should handle string settings', async () => {
      const stringSettings = {
        site_name: 'Test Site',
        site_description: 'Test Description',
        contact_email: 'test@example.com'
      };

      const result = await updateSiteSettings(stringSettings);

      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
    });
  });

  describe('Permissions', () => {
    it('should return permission error when admin lacks settings.write', async () => {
      const mockAdminClient = (await import('@/lib/supabase/admin')).createAdminClient;
      vi.mocked(mockAdminClient).mockImplementationOnce(() => ({
        from: vi.fn((table) => {
          if (table === 'profiles') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: { role: 'pro' }, error: null }))
                }))
              }))
            };
          }
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => Promise.resolve({ data: [{ id: 'main' }], error: null }))
              }))
            }))
          };
        })
      } as any));

      const result = await updateSiteSettings({ site_name: 'Blocked Update' });
      expect(result.status).toBe('error');
      expect(result.message).toContain("permission 'settings.write' requise");
    });

    it('should throw when admin lacks settings.maintenance.toggle permission', async () => {
      const mockAdminClient = (await import('@/lib/supabase/admin')).createAdminClient;
      vi.mocked(mockAdminClient).mockImplementationOnce(() => ({
        from: vi.fn((table) => {
          if (table === 'profiles') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: { role: 'pro' }, error: null }))
                }))
              }))
            };
          }
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          };
        })
      } as any));

      await expect(
        toggleMaintenanceMode(true, {
          reason: 'Maintenance preventive planifiee',
          confirmationText: 'ENABLE_MAINTENANCE'
        })
      ).rejects.toThrow("permission 'settings.maintenance.toggle' requise");
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate site settings cache on update', async () => {
      await updateSiteSettings({ site_name: 'Test' });

      expect(revalidateTag).toHaveBeenCalledWith('site-settings');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should invalidate cache when toggling maintenance mode', async () => {
      await toggleMaintenanceMode(true, {
        reason: 'Maintenance preventive planifiee',
        confirmationText: 'ENABLE_MAINTENANCE'
      });

      expect(revalidateTag).toHaveBeenCalledWith('site-settings');
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit action for settings updates', async () => {
      const settingsData = { site_name: 'New Name' };
      
      // Mock the audit logger
      const { logAuditAction } = await import('@/lib/audit-logger');
      vi.mocked(logAuditAction).mockResolvedValueOnce(undefined);

      await updateSiteSettings(settingsData);

      expect(logAuditAction).toHaveBeenCalledWith({
        adminId: 'admin-user-id',
        action: 'UPDATE_SITE_SETTINGS',
        targetType: 'site_settings',
        targetId: 'main',
        details: { keys: ['site_name'] }
      });
    });

    it('should log audit action for maintenance mode toggle', async () => {
      const { logAuditAction } = await import('@/lib/audit-logger');
      vi.mocked(logAuditAction).mockResolvedValueOnce(undefined);

      await toggleMaintenanceMode(true, {
        reason: 'Maintenance preventive planifiee',
        confirmationText: 'ENABLE_MAINTENANCE'
      });

      expect(logAuditAction).toHaveBeenCalledWith({
        adminId: 'admin-user-id',
        action: 'TOGGLE_MAINTENANCE',
        targetType: 'site_settings',
        targetId: 'main',
        details: {
          maintenance_mode: true,
          reason: 'Maintenance preventive planifiee',
          confirmation_text: 'ENABLE_MAINTENANCE'
        }
      });
    });

    it('should continue even if audit logging fails', async () => {
      const { logAuditAction } = await import('@/lib/audit-logger');
      vi.mocked(logAuditAction).mockRejectedValueOnce(new Error('Logging failed'));

      const result = await updateSiteSettings({ site_name: 'Test' });

      // Should still succeed despite audit logging failure
      expect(result).toEqual({
        status: 'success',
        message: 'Paramètres mis à jour et cache vidé avec succès.'
      });
    });
  });
});

import { expect, describe, it, vi, beforeEach } from 'vitest';
import { getNotifications, markAsRead, markAllAsRead, Notification } from './app/actions/notifications';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockCookiesGetAll = vi.fn();
const mockCookiesSetAll = vi.fn();

const mockListLimit = vi.fn();
const mockTargetMaybeSingle = vi.fn();
const mockUpdateSelect = vi.fn();
const mockMarkAllEq = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: mockCookiesGetAll,
    setAll: mockCookiesSetAll,
  })),
}));

describe('Notification System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGetAll.mockReturnValue([]);
    mockCookiesSetAll.mockReturnValue(undefined);

    const listQuery = {
      or: vi.fn(() => listQuery),
      order: vi.fn(() => listQuery),
      limit: mockListLimit,
    };

    const targetQuery = {
      eq: vi.fn(() => targetQuery),
      maybeSingle: mockTargetMaybeSingle,
    };

    const updateQuery = {
      eq: vi.fn((field: string, value: unknown) => {
        if (field === 'id') {
          return {
            select: mockUpdateSelect,
          };
        }
        return mockMarkAllEq(field, value);
      }),
    };

    mockFrom.mockReturnValue({
      select: vi.fn((columns: string) => {
        if (columns === 'id, user_id') {
          return targetQuery;
        }
        return listQuery;
      }),
      update: vi.fn(() => updateQuery),
    });
  });

  describe('getNotifications', () => {
    it('should return an empty array when no user is authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const notifications = await getNotifications();
      expect(notifications).toEqual([]);
    });

    it('should return notifications for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockNotifications: Notification[] = [
        {
          id: 1,
          user_id: 'test-user-id',
          title: 'Test Notification',
          message: 'This is a test notification',
          type: 'system',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockListLimit.mockResolvedValue({ data: mockNotifications, error: null });

      const notifications = await getNotifications();

      expect(notifications).toEqual(mockNotifications);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockListLimit).toHaveBeenCalledWith(20);
    });

    it('should handle errors when fetching notifications', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockListLimit.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const notifications = await getNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockTargetMaybeSingle.mockResolvedValue({ data: { id: 1, user_id: 'u1' }, error: null });
      mockUpdateSelect.mockResolvedValue({ data: [{ id: 1 }], error: null });

      const result = await markAsRead(1);
      expect(result).toEqual({ status: 'success', message: 'Notification lue.' });
    });

    it('should handle errors when marking notification as read', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockTargetMaybeSingle.mockResolvedValue({ data: { id: 1, user_id: 'u1' }, error: null });
      mockUpdateSelect.mockResolvedValue({ data: null, error: { message: 'Update error' } });

      const result = await markAsRead(1);
      expect(result).toEqual({ status: 'error', message: 'Impossible de marquer comme lu.' });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockMarkAllEq.mockResolvedValue({ error: null });

      const result = await markAllAsRead();
      expect(result).toEqual({ status: 'success', message: 'Toutes les notifications sont lues.' });
    });

    it('should return error when user is not authenticated for markAllAsRead', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await markAllAsRead();
      expect(result).toEqual({ status: 'error', message: 'Non authentifié' });
    });

    it('should handle errors when marking all notifications as read', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockMarkAllEq.mockResolvedValue({ error: { message: 'Update error' } });

      const result = await markAllAsRead();
      expect(result).toEqual({ status: 'error', message: 'Erreur lors de la mise à jour.' });
    });
  });
});

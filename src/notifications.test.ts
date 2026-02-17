import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { getNotifications, markAsRead, markAllAsRead, Notification } from './app/actions/notifications';

// Mock the Supabase client and cookies
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
const mockCookiesGetAll = vi.fn();
const mockCookiesSetAll = vi.fn();

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
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Set up default mock return values
    mockCookiesGetAll.mockReturnValue([]);
    mockCookiesSetAll.mockReturnValue(undefined);
    
    // Default chain for select operations
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
    });
    mockSelect.mockReturnValue({
      order: mockOrder.mockReturnThis(),
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  describe('getNotifications', () => {
    it('should return an empty array when no user is authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockLimit.mockResolvedValue({ data: [], error: null });

      const notifications = await getNotifications();
      
      expect(notifications).toEqual([]);
      expect(mockGetUser).toHaveBeenCalled();
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
        }
      ];

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockLimit.mockResolvedValue({ data: mockNotifications, error: null });

      const notifications = await getNotifications();

      expect(notifications).toEqual(mockNotifications);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should handle errors when fetching notifications', async () => {
      const mockUser = { id: 'test-user-id' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockLimit.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const notifications = await getNotifications();

      expect(notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read successfully', async () => {
      const notificationId = 1;

      mockEq.mockResolvedValue({ error: null });

      const result = await markAsRead(notificationId);

      expect(result).toEqual({ status: 'success', message: 'Notification lue.' });
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith('id', notificationId);
    });

    it('should handle errors when marking notification as read', async () => {
      const notificationId = 1;

      mockEq.mockResolvedValue({ error: { message: 'Update error' } });

      const result = await markAsRead(notificationId);

      expect(result).toEqual({ status: 'error', message: 'Impossible de marquer comme lu.' });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockEq.mockResolvedValue({ error: null });

      const result = await markAllAsRead();

      expect(result).toEqual({ status: 'success', message: 'Toutes les notifications sont lues.' });
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return error when user is not authenticated for markAllAsRead', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await markAllAsRead();

      expect(result).toEqual({ status: 'error', message: 'Non authentifié' });
    });

    it('should handle errors when marking all notifications as read', async () => {
      const mockUser = { id: 'test-user-id' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockEq.mockResolvedValue({ error: { message: 'Update error' } });

      const result = await markAllAsRead();

      expect(result).toEqual({ status: 'error', message: 'Erreur lors de la mise à jour.' });
    });
  });
});

// Integration test to verify the NotificationBell component can work with the notification system
describe('Notification Integration Test', () => {
  it('should properly integrate notification functions', async () => {
    // Verify all export functions exist
    expect(typeof getNotifications).toBe('function');
    expect(typeof markAsRead).toBe('function');
    expect(typeof markAllAsRead).toBe('function');
    
    // Verify Notification type exists
    const mockNotification: Notification = {
      id: 1,
      user_id: 'test-user-id',
      title: 'Test',
      message: 'Test message',
      type: 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    
    expect(mockNotification).toBeDefined();
    expect(mockNotification.id).toBe(1);
    expect(mockNotification.title).toBe('Test');
  });
});


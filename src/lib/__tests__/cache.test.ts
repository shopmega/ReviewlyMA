import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidateTag } from 'next/cache';
import { invalidateCache, CACHE_TAGS, CACHE_KEYS } from '../cache';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('Cache Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invalidateCache', () => {
    it('should call revalidateTag for each tag', async () => {
      const tags = [CACHE_TAGS.COMPANY, CACHE_TAGS.REVIEWS];
      await invalidateCache(tags);
      
      expect(revalidateTag).toHaveBeenCalledTimes(2);
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.COMPANY);
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.REVIEWS);
    });

    it('should handle empty tags array', async () => {
      await invalidateCache([]);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(revalidateTag).mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Should not throw
      await expect(invalidateCache([CACHE_TAGS.COMPANY])).resolves.not.toThrow();
    });
  });

  describe('Cache Constants', () => {
    it('should have all required cache tags', () => {
      expect(CACHE_TAGS.COMPANY).toBe('company');
      expect(CACHE_TAGS.REVIEWS).toBe('reviews');
      expect(CACHE_TAGS.SITE_SETTINGS).toBe('site-settings');
      expect(CACHE_TAGS.COLLECTIONS).toBe('collections');
    });

    it('should have cache key generators', () => {
      expect(CACHE_KEYS.BUSINESS_BY_SLUG('test-slug')).toBe('business-test-slug');
      expect(CACHE_KEYS.USER_PROFILE('user-123')).toBe('user-profile-user-123');
    });
  });
});




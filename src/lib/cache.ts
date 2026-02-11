/**
 * Caching utilities for Next.js application
 * Implements server component caching, data caching, and cache invalidation
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Cache tags for invalidation
export const CACHE_TAGS = {
  COMPANY: 'company',
  REVIEWS: 'reviews',
  PROFILES: 'profiles',
  SETTINGS: 'settings',
  COLLECTIONS: 'collections',
  CLAIMS: 'claims',
  SITE_SETTINGS: 'site-settings',
  FEATURED_COMPANIES: 'featured-companies',
  COMPANY_CATEGORIES: 'categories',
  USER_DATA: 'user-data',
} as const;

// Cache keys for specific data
export const CACHE_KEYS = {
  SITE_SETTINGS: 'site-settings',
  BUSINESSES: 'businesses',
  BUSINESS_BY_SLUG: (slug: string) => `business-${slug}`,
  BUSINESS_REVIEWS: (id: string) => `business-reviews-${id}`,
  USER_PROFILE: (userId: string) => `user-profile-${userId}`,
  USER_CLAIMS: (userId: string) => `user-claims-${userId}`,
  BUSINESS_HOURS: (id: string) => `business-hours-${id}`,
  SEASONAL_COLLECTIONS: 'seasonal-collections',
  FEATURED_BUSINESSES: 'featured-businesses',
  BUSINESS_CATEGORIES: 'business-categories',
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  BUSINESS_HOURS: 900, // 15 minutes
  REVIEWS: 300, // 5 minutes
  USER_DATA: 300, // 5 minutes
  SITE_SETTINGS: 3600, // 1 hour
  SEASONAL_COLLECTIONS: 1800, // 30 minutes
} as const;

/**
 * Optimized cache fetcher using unstable_cache
 */
export const getCachedSiteSettings = async () => {
  const { getSiteSettings } = await import('./data');
  return unstable_cache(
    async () => getSiteSettings(),
    [CACHE_KEYS.SITE_SETTINGS],
    { revalidate: CACHE_CONFIG.VERY_LONG, tags: [CACHE_TAGS.SITE_SETTINGS] }
  )();
};

/**
 * Cache businesses with 5 minute TTL
 */
export const getCachedBusinesses = async (filters?: any) => {
  const { getBusinesses } = await import('./data');
  // Create a unique key based on filters to avoid collisions
  const filtersKey = JSON.stringify(filters || {});
  return unstable_cache(
    async () => getBusinesses(filters),
    [CACHE_KEYS.BUSINESSES, filtersKey],
    { revalidate: CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.COMPANY] }
  )();
};

/**
 * Cache business by ID
 */
export const getCachedBusinessById = async (id: string) => {
  const { getBusinessById } = await import('./data');
  return unstable_cache(
    async () => getBusinessById(id),
    [CACHE_KEYS.BUSINESS_BY_SLUG(id)],
    { revalidate: CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.COMPANY, `company-${id}`] }
  )();
};

/**
 * Cache business by slug (currently uses ID)
 */
export const getCachedBusinessBySlug = async (slug: string) => {
  const { getBusinessBySlug } = await import('./data');
  return unstable_cache(
    async () => getBusinessBySlug(slug),
    [CACHE_KEYS.BUSINESS_BY_SLUG(slug)],
    { revalidate: CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.COMPANY, `company-${slug}`] }
  )();
};

/**
 * Cache seasonal collections
 */
export const getCachedSeasonalCollections = async () => {
  const { getSeasonalCollections } = await import('./data');
  return unstable_cache(
    async () => getSeasonalCollections(),
    [CACHE_KEYS.SEASONAL_COLLECTIONS],
    { revalidate: CACHE_CONFIG.LONG, tags: [CACHE_TAGS.COLLECTIONS] }
  )();
};

/**
 * Cache featured businesses
 */
export const getCachedFeaturedBusinesses = async () => {
  const { getFeaturedBusinesses } = await import('./data');
  return unstable_cache(
    async () => getFeaturedBusinesses(),
    [CACHE_KEYS.FEATURED_BUSINESSES],
    { revalidate: CACHE_CONFIG.LONG, tags: [CACHE_TAGS.FEATURED_COMPANIES] }
  )();
};

/**
 * Cache active categories
 */
export const getCachedActiveCategories = async () => {
  const { getActiveCategories } = await import('@/app/actions/categories');
  return unstable_cache(
    async () => getActiveCategories(),
    [CACHE_KEYS.BUSINESS_CATEGORIES],
    { revalidate: CACHE_CONFIG.LONG, tags: [CACHE_TAGS.COMPANY_CATEGORIES] }
  )();
};

/**
 * Other existing utilities (minimal changes)
 */
export const cachedDataFetch = <T>(
  fetcher: () => Promise<T>,
  cacheKey: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
) => {
  return unstable_cache(
    async () => {
      try {
        return await fetcher();
      } catch (error) {
        console.error(`Cache fetch error for ${cacheKey.join('-')}:`, error);
        throw error;
      }
    },
    cacheKey,
    {
      revalidate: options.revalidate || 300,
      tags: options.tags || [],
    }
  )();
};

import { revalidateTag } from 'next/cache';

/**
 * Invalidate cache by tags
 * This actually calls Next.js revalidateTag to clear cached data
 */
export async function invalidateCache(tags: string[]) {
  try {
    for (const tag of tags) {
      revalidateTag(tag);
    }
  } catch (error) {
    // Log error but don't throw - cache invalidation failures shouldn't break the app
    console.error('Cache invalidation error:', error);
  }
}

export default {
  CACHE_TAGS,
  CACHE_KEYS,
  CACHE_CONFIG,
  getCachedSiteSettings,
  getCachedBusinesses,
  getCachedBusinessById,
  getCachedBusinessBySlug,
  getCachedSeasonalCollections,
  getCachedFeaturedBusinesses,
  getCachedActiveCategories,
  cachedDataFetch,
  invalidateCache,
};

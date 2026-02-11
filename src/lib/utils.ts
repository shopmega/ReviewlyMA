import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates if a string is a valid URL for Next.js Image component
 */
export function isValidImageUrl(url?: string): boolean {
  if (!url) return false;
  // Next.js internal paths
  if (url.startsWith('/')) return true;
  // Remote URLs
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  // Data URLs
  if (url.startsWith('data:')) return true;

  return false;
}

/**
 * Simple slugify function
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Get city name from slug
 */
import { ALL_CITIES } from './location-discovery';

export function getCityFromSlug(slug: string): string | undefined {
  return ALL_CITIES.find(city => slugify(city) === slug);
}

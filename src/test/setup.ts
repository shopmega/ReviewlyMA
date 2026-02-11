/**
 * Vitest setup file
 * Runs before all tests
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
// NODE_ENV is set by the test runner, no need to set manually

// Mock Next.js modules
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: any) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const React = require('react');
  return {
    Loader2: () => React.createElement('span', { 'data-testid': 'loader-icon' }, 'Loader'),
    Share2: () => React.createElement('span', { 'data-testid': 'share-icon' }, 'Share'),
    Bookmark: () => React.createElement('span', { 'data-testid': 'bookmark-icon' }, 'Bookmark'),
    ThumbsUp: () => React.createElement('span', { 'data-testid': 'thumbs-up-icon' }, 'ThumbsUp'),
    ThumbsDown: () => React.createElement('span', { 'data-testid': 'thumbs-down-icon' }, 'ThumbsDown'),
    MessageCircle: () => React.createElement('span', { 'data-testid': 'message-circle-icon' }, 'MessageCircle'),
    Facebook: () => React.createElement('span', { 'data-testid': 'facebook-icon' }, 'Facebook'),
    Twitter: () => React.createElement('span', { 'data-testid': 'twitter-icon' }, 'Twitter'),
    Pencil: () => React.createElement('span', { 'data-testid': 'pencil-icon' }, 'Pencil'),
    Phone: () => React.createElement('span', { 'data-testid': 'phone-icon' }, 'Phone'),
    Globe: () => React.createElement('span', { 'data-testid': 'globe-icon' }, 'Globe'),
    Mail: () => React.createElement('span', { 'data-testid': 'mail-icon' }, 'Mail'),
  };
});
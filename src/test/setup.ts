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
  const testIds: Record<string, string> = {
    Loader2: 'loader-icon',
    Share2: 'share-icon',
    Bookmark: 'bookmark-icon',
    ThumbsUp: 'thumbs-up-icon',
    ThumbsDown: 'thumbs-down-icon',
    MessageCircle: 'message-circle-icon',
    Facebook: 'facebook-icon',
    Twitter: 'twitter-icon',
    Pencil: 'pencil-icon',
    Phone: 'phone-icon',
    Globe: 'globe-icon',
    Mail: 'mail-icon',
  };

  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        const dataTestId = testIds[prop] || `${String(prop)}-icon`;
        return () => React.createElement('span', { 'data-testid': dataTestId }, String(prop));
      },
    }
  );
});

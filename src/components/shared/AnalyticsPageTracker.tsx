'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/analytics';

export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const search = searchParams?.toString() || '';
    const pagePath = search ? `${pathname}?${search}` : pathname;

    if (lastTrackedPath.current === pagePath) {
      return;
    }

    lastTrackedPath.current = pagePath;

    analytics.track('page_view', {
      page_path: pathname,
      page_query: search,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      page_title: typeof document !== 'undefined' ? document.title : undefined,
      source: 'router_change',
    });
  }, [pathname, searchParams]);

  return null;
}

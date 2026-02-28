'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/analytics';

export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>('');
  const trackedShareIds = useRef<Set<string>>(new Set());

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

    const shareId = searchParams?.get('share_id');
    if (!shareId || trackedShareIds.current.has(shareId)) {
      return;
    }

    trackedShareIds.current.add(shareId);
    analytics.track('link_opened', {
      share_id: shareId,
      utm_source: searchParams?.get('utm_source') || null,
      utm_medium: searchParams?.get('utm_medium') || null,
      utm_campaign: searchParams?.get('utm_campaign') || null,
      utm_content: searchParams?.get('utm_content') || null,
      page_path: pathname,
      page_query: search,
    });
  }, [pathname, searchParams]);

  return null;
}

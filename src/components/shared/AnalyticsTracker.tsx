'use client';

import { useEffect } from 'react';
import { trackBusinessEvent } from '@/app/actions/analytics';

interface AnalyticsTrackerProps {
    businessId: string;
}

export function AnalyticsTracker({ businessId }: AnalyticsTrackerProps) {
    useEffect(() => {
        if (businessId) {
            trackBusinessEvent(businessId, 'page_view');
        }
    }, [businessId]);

    return null;
}

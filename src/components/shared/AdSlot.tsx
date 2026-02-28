'use client';

import { useEffect, useMemo, useRef } from 'react';

interface AdSlotProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    layout?: 'in-article';
    className?: string;
    style?: React.CSSProperties;
    pubId?: string | null;
    enabled?: boolean;
}

const SLOT_ENV_MAP: Record<string, string | undefined> = {
    'home-top-banner': process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP_BANNER,
    'mobile-sidebar-ad': process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_SIDEBAR_AD,
    'desktop-sidebar-ad': process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_SIDEBAR_AD,
    'grid-middle-ad': process.env.NEXT_PUBLIC_ADSENSE_SLOT_GRID_MIDDLE_AD,
    'business-sidebar-ad': process.env.NEXT_PUBLIC_ADSENSE_SLOT_BUSINESS_SIDEBAR_AD,
    'categories-top-ad': process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATEGORIES_TOP_AD,
};

function normalizePublisherId(rawValue?: string | null): string | null {
    if (!rawValue) return null;
    const trimmed = rawValue.trim();
    if (!trimmed || trimmed === 'ca-pub-XXXXXXXXXXXXXXXX') return null;
    if (trimmed.startsWith('ca-pub-')) return trimmed;
    if (trimmed.startsWith('pub-')) return `ca-${trimmed}`;
    return null;
}

function normalizeSlotId(slot: string): string | null {
    const trimmed = slot.trim();
    const directMatch = /^\d{6,}$/.test(trimmed) ? trimmed : null;
    if (directMatch) return directMatch;

    const mapped = SLOT_ENV_MAP[trimmed];
    if (mapped && /^\d{6,}$/.test(mapped.trim())) {
        return mapped.trim();
    }

    return null;
}

export function AdSlot({ slot, format = 'auto', layout, className, style, pubId, enabled = true }: AdSlotProps) {
    const resolvedPubId = useMemo(() => normalizePublisherId(pubId || process.env.NEXT_PUBLIC_ADSENSE_PUB_ID), [pubId]);
    const resolvedSlotId = useMemo(() => normalizeSlotId(slot), [slot]);
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && enabled && resolvedPubId && resolvedSlotId && adRef.current) {
            try {
                if (adRef.current.getAttribute('data-adsbygoogle-status') === 'done') {
                    return;
                }
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error('AdSense Error:', err);
            }
        }
    }, [enabled, resolvedPubId, resolvedSlotId]);

    if (!enabled || !resolvedPubId || !resolvedSlotId) {
        return null;
    }

    return (
        <div className={`overflow-hidden ${className}`} style={style}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', ...style }}
                data-ad-client={resolvedPubId}
                data-ad-slot={resolvedSlotId}
                data-ad-format={format}
                data-full-width-responsive="true"
                {...(layout ? { 'data-ad-layout': layout } : {})}
            />
        </div>
    );
}

'use client';

import Script from 'next/script';

interface AdSenseProps {
    pubId?: string | null;
    enabled?: boolean;
    autoAdsEnabled?: boolean;
}

function normalizePublisherId(rawValue?: string | null): string | null {
    if (!rawValue) return null;

    const trimmed = rawValue.trim();
    if (!trimmed || trimmed === 'ca-pub-XXXXXXXXXXXXXXXX') return null;

    if (trimmed.startsWith('ca-pub-')) return trimmed;
    if (trimmed.startsWith('pub-')) return `ca-${trimmed}`;

    return null;
}

export function AdSense({ pubId, enabled = true, autoAdsEnabled = true }: AdSenseProps) {
    const resolvedPubId = normalizePublisherId(pubId || process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);

    if (!enabled || !resolvedPubId || !autoAdsEnabled) {
        return null;
    }

    return (
        <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${resolvedPubId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
    );
}

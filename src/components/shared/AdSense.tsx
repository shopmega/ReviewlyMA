'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export function AdSense() {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

    if (!pubId || pubId === 'ca-pub-XXXXXXXXXXXXXXXX') {
        return null;
    }

    return (
        <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
    );
}

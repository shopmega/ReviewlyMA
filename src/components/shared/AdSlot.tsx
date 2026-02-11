'use client';

import { useEffect, useRef, useState } from 'react';

interface AdSlotProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    layout?: 'in-article';
    className?: string;
    style?: React.CSSProperties;
}

export function AdSlot({ slot, format = 'auto', layout, className, style }: AdSlotProps) {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
    const adRef = useRef<HTMLModElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && pubId && pubId !== 'ca-pub-XXXXXXXXXXXXXXXX') {
            try {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setIsLoaded(true);
            } catch (err) {
                console.error('AdSense Error:', err);
            }
        }
    }, [pubId]);

    if (!pubId || pubId === 'ca-pub-XXXXXXXXXXXXXXXX') {
        return (
            <div className={`bg-muted/30 border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs p-4 rounded-xl ${className}`} style={style}>
                Ad Slot: {slot}
            </div>
        );
    }

    return (
        <div className={`overflow-hidden ${className}`} style={style}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', ...style }}
                data-ad-client={pubId}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive="true"
                {...(layout ? { 'data-ad-layout': layout } : {})}
            />
        </div>
    );
}

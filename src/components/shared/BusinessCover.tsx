'use client';

import { Business } from '@/lib/types';
import { isValidImageUrl } from '@/lib/utils';
import { getStoragePublicUrl } from '@/lib/data';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface BusinessCoverProps {
    business: Business;
    alt: string;
    className?: string;
    fill?: boolean;
    width?: number;
    height?: number;
    priority?: boolean;
    sizes?: string;
    fallbackToGallery?: boolean;
}

export function BusinessCover({
    business,
    alt,
    className,
    fill,
    width,
    height,
    priority = false,
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    fallbackToGallery = false
}: BusinessCoverProps) {
    const [imageError, setImageError] = useState(false);

    // Reset error state if url changes
    useEffect(() => {
        setImageError(false);
    }, [business.cover_url, business.photos]);

    // Determine the best available image
    const coverUrlRaw = business.cover_url;
    const galleryFirstUrlRaw = (fallbackToGallery && business.photos && business.photos.length > 0)
        ? business.photos[0].imageUrl
        : null;

    const resolvedCoverUrl = getStoragePublicUrl(coverUrlRaw || null);
    const resolvedGalleryUrl = getStoragePublicUrl(galleryFirstUrlRaw || null);

    const hasCover = !imageError && resolvedCoverUrl && isValidImageUrl(resolvedCoverUrl);
    const hasGalleryFallback = !imageError && fallbackToGallery && resolvedGalleryUrl && isValidImageUrl(resolvedGalleryUrl);

    const coverUrl = hasCover
        ? resolvedCoverUrl
        : (hasGalleryFallback ? resolvedGalleryUrl : null);

    const getFallbackPalette = () => {
        const seed = `${business.name || ''}-${business.category || ''}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const palettes = [
            'from-sky-600 to-blue-700',
            'from-emerald-600 to-teal-700',
            'from-indigo-600 to-blue-700',
            'from-cyan-600 to-sky-700',
            'from-amber-600 to-orange-700',
            'from-rose-600 to-pink-700',
        ];
        return palettes[Math.abs(hash) % palettes.length];
    };

    const initials = (business.name || 'B')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
    const fallbackSizingClass = fill
        ? 'absolute inset-0 h-full w-full'
        : 'h-full w-full';

    if (coverUrl) {
        if (fill) {
            return (
                <Image
                    src={coverUrl}
                    alt={alt}
                    fill
                    className={className}
                    priority={priority}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                    onError={() => setImageError(true)}
                />
            );
        }
        return (
            <Image
                src={coverUrl}
                alt={alt}
                width={width}
                height={height}
                className={className}
                priority={priority}
                sizes={`${width}px`}
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div
            className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${getFallbackPalette()} ${fallbackSizingClass} ${className || ''}`}
            style={!fill && width && height ? { width, height } : undefined}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_50%)]" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(120deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.12)_75%,transparent_75%,transparent)] bg-[length:22px_22px]" />
            <div className="relative z-10 px-4 text-white text-center">
                <p className="text-3xl md:text-4xl font-black tracking-tight leading-none">{initials || 'B'}</p>
            </div>
        </div>
    );
}

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
            className={`flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900/50 ${className}`}
        />
    );
}

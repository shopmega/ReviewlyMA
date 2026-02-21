'use client';

import { Business } from '@/lib/types';
import { isValidImageUrl } from '@/lib/utils';
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
    fallbackToGallery = true
}: BusinessCoverProps) {
    const [imageError, setImageError] = useState(false);

    // Reset error state if url changes
    useEffect(() => {
        setImageError(false);
    }, [business.cover_url, business.photos]);

    // Determine the best available image
    const hasCover = !imageError && business.cover_url && isValidImageUrl(business.cover_url);
    const hasGalleryFallback = !imageError && fallbackToGallery && business.photos && business.photos.length > 0 && isValidImageUrl(business.photos[0].imageUrl);
    const coverUrl = hasCover
        ? business.cover_url
        : (hasGalleryFallback ? business.photos[0].imageUrl : null);

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

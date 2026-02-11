'use client';

import { PhotoGallery as SharedPhotoGallery } from '@/components/shared/PhotoGallery';
import { Business } from '@/lib/types';

interface PhotoGalleryProps {
    photos: Business['photos'];
    businessName?: string;
    businessId?: string;
}

export function PhotoGallery({ photos, businessName = '', businessId = '' }: PhotoGalleryProps) {
    if (!photos || photos.length === 0) return null;

    return (
        <section id="photos" className="scroll-mt-24">
            <h2 className="text-xl font-bold font-headline mb-6 flex items-center gap-2">
                Galerie Photos
            </h2>
            <div className="h-[400px] md:h-[550px] rounded-2xl overflow-hidden shadow-lg border border-border/40">
                <SharedPhotoGallery photos={photos} businessName={businessName} businessId={businessId} />
            </div>
        </section>
    );
}

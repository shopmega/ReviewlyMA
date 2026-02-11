import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { isValidImageUrl, cn } from '@/lib/utils';

import { MediaReportDialog } from './MediaReportDialog';
import { PhotoLightbox } from './PhotoLightbox';

type PhotoGalleryProps = {
  photos: ImagePlaceholder[];
  businessName: string;
  businessId: string;
};

export function PhotoGallery({ photos, businessName, businessId }: PhotoGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [initialLightboxIndex, setInitialLightboxIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const onDotButtonClick = useCallback((index: number) => {
    if (!api) return;
    api.scrollTo(index);
  }, [api]);

  const openLightbox = (index: number) => {
    setInitialLightboxIndex(index);
    setLightboxOpen(true);
  };

  <div className="relative w-full h-full bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-8 text-center group">
    <div className="absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] bg-[length:40px_40px]" />
    <div className="relative z-10 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center">
        <MapPin className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune photo disponible</p>
    </div>
  </div>

  return (
    <>
      <Carousel
        className="w-full h-full group"
        opts={{ loop: true }}
        setApi={setApi}
      >
        <CarouselContent className="h-full">
          {photos.map((photo, index) => {
            if (!isValidImageUrl(photo.imageUrl)) return null;
            return (
              <CarouselItem key={index} className="h-full">
                <div
                  className="relative h-full w-full bg-muted cursor-zoom-in"
                  onClick={() => openLightbox(index)}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={`${businessName} - Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                    data-ai-hint={photo.imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Reporting Button */}
                  <div className="absolute top-4 right-16 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
                    <MediaReportDialog mediaUrl={photo.imageUrl} businessId={businessId} />
                  </div>

                  {photo.description && (
                    <div className="absolute bottom-4 left-6 text-white text-sm font-medium drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {photo.description}
                    </div>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex bg-white/20 hover:bg-white/40 border-none text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex bg-white/20 hover:bg-white/40 border-none text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        )}

        {/* Pagination Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => onDotButtonClick(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  current === index
                    ? "bg-white w-4"
                    : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </Carousel>

      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={photos}
        initialIndex={initialLightboxIndex}
        businessName={businessName}
      />
    </>
  );
}

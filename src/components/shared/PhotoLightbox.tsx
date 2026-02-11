'use client';

import * as React from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

interface PhotoLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    photos: ImagePlaceholder[];
    initialIndex: number;
    businessName: string;
}

export function PhotoLightbox({
    isOpen,
    onClose,
    photos,
    initialIndex,
    businessName,
}: PhotoLightboxProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    React.useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    const goToNext = React.useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, [photos.length]);

    const goToPrev = React.useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }, [photos.length]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToNext, goToPrev, onClose]);

    if (!photos.length) return null;

    const currentPhoto = photos[currentIndex];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden">
                <DialogTitle className="sr-only">
                    Photo de {businessName} - {currentIndex + 1} sur {photos.length}
                </DialogTitle>

                <div className="relative w-full h-full flex items-center justify-center group">
                    {/* Main Image */}
                    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                        <Image
                            src={currentPhoto.imageUrl}
                            alt={`${businessName} - Photo ${currentIndex + 1}`}
                            fill
                            className="object-contain pointer-events-auto"
                            priority
                            quality={100}
                        />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute inset-x-0 inset-y-0 flex items-center justify-between pointer-events-none px-4 md:px-8">
                        <div className="pointer-events-auto flex items-center gap-4">
                            {photos.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md"
                                    onClick={goToPrev}
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>
                            )}
                        </div>

                        <div className="pointer-events-auto flex items-center gap-4">
                            {photos.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md"
                                    onClick={goToNext}
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Top Bar */}
                    <div className="absolute top-4 left-0 right-0 px-4 md:px-8 flex justify-between items-start pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium border border-white/10 pointer-events-auto">
                            {currentIndex + 1} / {photos.length}
                        </div>

                        <div className="flex gap-2 pointer-events-auto">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md"
                                onClick={onClose}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Caption */}
                    {currentPhoto.description && (
                        <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl text-white text-sm max-w-2xl text-center border border-white/10 pointer-events-auto shadow-2xl">
                                {currentPhoto.description}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

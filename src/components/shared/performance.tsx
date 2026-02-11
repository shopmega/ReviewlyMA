import dynamic from 'next/dynamic';
import { Suspense, ComponentType } from 'react';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
export const LazyHomeClient = dynamic(() => import('@/components/shared/HomeClient').then(mod => ({ default: mod.HomeClient })), {
  loading: () => <HomeSkeleton />,
  ssr: true
});

export const LazyBusinessHero = dynamic(() => import('@/components/business/BusinessHero').then(mod => ({ default: mod.BusinessHero })), {
  loading: () => <HeroSkeleton />,
  ssr: true
});

export const LazyReviewsSection = dynamic(() => import('@/components/business/ReviewsSection').then(mod => ({ default: mod.ReviewsSection })), {
  loading: () => <ReviewsSkeleton />,
  ssr: true // Keep SSR for better performance
});

export const LazyPhotoGallery = dynamic(() => import('@/components/business/PhotoGallery').then(mod => ({ default: mod.PhotoGallery })), {
  loading: () => <GallerySkeleton />,
  ssr: true // Keep SSR for better performance
});

// Skeleton components for loading states
function HomeSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-96 bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="h-96 bg-muted rounded-2xl animate-pulse">
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ComponentType<any>
) {
  const LazyComponent = dynamic(() => Promise.resolve(Component), {
    loading: fallback ? () => React.createElement(fallback, {}) : undefined,
    ssr: true
  });

  return LazyComponent;
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Log slow components (>100ms)
      if (loadTime > 100) {
        console.warn(`${componentName} took ${loadTime.toFixed(2)}ms to load`);
      }
    };
  }, [componentName]);
}
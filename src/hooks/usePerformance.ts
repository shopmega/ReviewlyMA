import { useEffect, useRef } from 'react';

/**
 * Hook to monitor component performance
 */
export function useComponentPerformance(componentName: string) {
  const mountTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      if (mountTime.current) {
        const totalTime = performance.now() - mountTime.current;
        console.log(`${componentName} was mounted for ${totalTime.toFixed(2)}ms (${renderCount.current} renders)`);
      }
    };
  });

  useEffect(() => {
    renderCount.current += 1;
  });
}

/**
 * Web Vitals tracking
 */
export function useWebVitals() {
  useEffect(() => {
    // Track Core Web Vitals
    if (typeof window !== 'undefined') {
      import('web-vitals').then((webVitals) => {
        webVitals.onCLS(console.log);
        webVitals.onFID(console.log);
        webVitals.onFCP(console.log);
        webVitals.onLCP(console.log);
        webVitals.onTTFB(console.log);
      }).catch(() => {
        // Silently fail if web-vitals is not available
      });
    }
  }, []);
}

/**
 * Bundle analyzer for development
 */
export function useBundleAnalyzer() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log bundle size information
      console.log('Bundle analyzer active - check Network tab for chunk sizes');
    }
  }, []);
}
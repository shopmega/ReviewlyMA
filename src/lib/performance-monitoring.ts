'use client';

// Performance monitoring service
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  pageLoadTime?: number;
  domContentLoaded?: number;
  resourceLoadTime?: number;
  apiResponseTime?: number;
  
  // User experience metrics
  interactionDelay?: number;
  scrollPerformance?: number;
  memoryUsage?: number;
  
  // Context
  page: string;
  timestamp: string;
  userAgent: string;
  connectionType?: string;
  deviceType?: string;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    this.isInitialized = true;
    this.setupCoreWebVitalsMonitoring();
    this.setupResourceTiming();
    this.setupUserInteractionMonitoring();
    this.setupMemoryMonitoring();
  }

  private setupCoreWebVitalsMonitoring() {
    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart) {
              this.recordMetric('fid', entry.processingStart - entry.startTime);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }

      // Cumulative Layout Shift (CLS)
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.recordMetric('cls', clsValue);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      }

      // First Contentful Paint (FCP)
      if ('PerformanceObserver' in window) {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.recordMetric('fcp', fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      }
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private setupResourceTiming() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            this.recordMetric('apiResponseTime', entry.responseEnd - entry.requestStart);
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing monitoring failed:', error);
    }
  }

  private setupUserInteractionMonitoring() {
    let interactionStart = 0;
    
    const measureInteraction = () => {
      interactionStart = performance.now();
    };

    const recordInteraction = () => {
      if (interactionStart > 0) {
        const interactionDelay = performance.now() - interactionStart;
        this.recordMetric('interactionDelay', interactionDelay);
        interactionStart = 0;
      }
    };

    document.addEventListener('mousedown', measureInteraction);
    document.addEventListener('mouseup', recordInteraction);
    document.addEventListener('touchstart', measureInteraction);
    document.addEventListener('touchend', recordInteraction);
  }

  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memoryUsage', memory.usedJSHeapSize);
      }, 30000); // Every 30 seconds
    }
  }

  private recordMetric(type: keyof PerformanceMetrics, value: number) {
    const metric: Partial<PerformanceMetrics> = {
      [type]: value,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceType: this.getDeviceType()
    };

    this.metrics.push(metric as PerformanceMetrics);

    // Send to analytics if threshold exceeded
    this.checkPerformanceThresholds(metric as PerformanceMetrics);
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceType(): string {
    const width = window.screen.width;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private checkPerformanceThresholds(metric: PerformanceMetrics) {
    const thresholds = {
      lcp: 2500, // Good: <2.5s
      fid: 100,  // Good: <100ms
      cls: 0.1,  // Good: <0.1
      fcp: 1800, // Good: <1.8s
      apiResponseTime: 1000, // Good: <1s
      interactionDelay: 100   // Good: <100ms
    };

    Object.entries(thresholds).forEach(([key, threshold]) => {
      const value = metric[key as keyof PerformanceMetrics];
      if (value && typeof value === 'number' && value > threshold) {
        this.reportPerformanceIssue(key, value, threshold);
      }
    });
  }

  private reportPerformanceIssue(metric: string, value: number, threshold: number) {
    console.warn(`Performance issue detected: ${metric} = ${value}ms (threshold: ${threshold}ms)`);
    
    // Send to monitoring service
    this.sendToMonitoringService({
      type: 'performance_issue',
      metric,
      value,
      threshold,
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }

  private sendToMonitoringService(data: any) {
    if (process.env.NEXT_PUBLIC_PERFORMANCE_WEBHOOK) {
      fetch(process.env.NEXT_PUBLIC_PERFORMANCE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {
        // Silently fail
      });
    }
  }

  // Public API
  measurePageLoad(pageName?: string) {
    if (!this.isInitialized) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      
      this.recordMetric('pageLoadTime', pageLoadTime);
      this.recordMetric('domContentLoaded', domContentLoaded);
    }
  }

  measureApiCall(endpoint: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.recordMetric('apiResponseTime', duration);
    
    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const sum = this.metrics.reduce((acc, metric) => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'timestamp') {
          acc[key] = (acc[key] || 0) + value;
        }
      });
      return acc;
    }, {} as any);

    const count = this.metrics.length;
    Object.keys(sum).forEach(key => {
      sum[key] = sum[key] / count;
    });

    return sum;
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitoringService();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  return {
    measurePageLoad: performanceMonitor.measurePageLoad.bind(performanceMonitor),
    measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAverageMetrics: performanceMonitor.getAverageMetrics.bind(performanceMonitor)
  };
}

// API wrapper for automatic performance tracking
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      performanceMonitor.measureApiCall(operationName, startTime);
      return result;
    } catch (error) {
      performanceMonitor.measureApiCall(`${operationName}_error`, startTime);
      throw error;
    }
  };
}

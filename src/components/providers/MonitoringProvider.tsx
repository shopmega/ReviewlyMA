'use client';

import React, { useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance-monitoring';
import { errorTracker, ErrorBoundary } from '@/lib/error-tracking';
import { realTimeMonitor } from '@/lib/real-time-monitoring';
import { useErrorTracking } from '@/lib/error-tracking';
import { useAnalytics } from '@/lib/analytics';
import { usePerformanceMonitoring } from '@/lib/performance-monitoring';
import { useRealTimeMonitoring } from '@/lib/real-time-monitoring';
import type { AnalyticsEvent } from '@/lib/analytics';

interface MonitoringProviderProps {
  children: React.ReactNode;
  userId?: string;
  enableAnalytics?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableErrorTracking?: boolean;
  enableRealTimeMonitoring?: boolean;
}

export function MonitoringProvider({
  children,
  userId,
  enableAnalytics = true,
  enablePerformanceMonitoring = true,
  enableErrorTracking = false, // Disabled to avoid conflicts with ErrorTrackingService
  enableRealTimeMonitoring = true
}: MonitoringProviderProps) {
  const [isMonitoringReady, setIsMonitoringReady] = useState(false);
  const { captureError } = useErrorTracking();
  const { trackPageLoadTime } = useAnalytics();
  const { measurePageLoad } = usePerformanceMonitoring();
  const { unresolvedAlerts } = useRealTimeMonitoring();

  useEffect(() => {
    // Initialize monitoring services
    const initializeMonitoring = async () => {
      try {
        // Set user context for all monitoring services
        if (userId) {
          analytics.setUser(null); // TODO: Pass proper User object when available
          errorTracker.setUser(userId);
        }

        // Initialize performance monitoring
        if (enablePerformanceMonitoring) {
          measurePageLoad();
        }

        // Track initial page load
        if (enableAnalytics) {
          const loadTime = performance.now();
          trackPageLoadTime(window.location.pathname, loadTime);
        }

        setIsMonitoringReady(true);
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
        if (enableErrorTracking) {
          captureError({
            message: (error as Error).message,
            stack: (error as Error).stack,
            type: 'javascript',
            context: 'monitoring_init'
          });
        }
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      initializeMonitoring();
    } else {
      window.addEventListener('load', initializeMonitoring);
      return () => window.removeEventListener('load', initializeMonitoring);
    }
  }, [userId, enableAnalytics, enablePerformanceMonitoring, enableErrorTracking]);

  useEffect(() => {
    // Track page navigation
    const handleRouteChange = () => {
      if (enableAnalytics) {
        analytics.track('page_view', {
          page: window.location.pathname,
          referrer: document.referrer
        });
      }

      if (enablePerformanceMonitoring) {
        measurePageLoad();
      }
    };

    // Override pushState and replaceState to catch navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleRouteChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleRouteChange, 0);
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [enableAnalytics, enablePerformanceMonitoring]);

  useEffect(() => {
    // Track user interactions
    const handleUserInteraction = (event: Event) => {
      if (enableAnalytics) {
        const target = event.target as HTMLElement;
        const interactionType = event.type;
        const elementTag = target.tagName.toLowerCase();
        const elementId = target.id;
        const elementClass = target.className;

        analytics.track('page_view', {
          interaction_type: interactionType,
          element_tag: elementTag,
          element_id: elementId,
          element_class: elementClass
        });
      }
    };

    if (enableAnalytics) {
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('scroll', handleUserInteraction, { passive: true });
    }

    return () => {
      if (enableAnalytics) {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('scroll', handleUserInteraction);
      }
    };
  }, [enableAnalytics]);

  useEffect(() => {
    // Track visibility changes (user leaving/returning to page)
    const handleVisibilityChange = () => {
      if (enableAnalytics) {
        if (document.hidden) {
          analytics.track('page_view', {
            event: 'page_hidden',
            time_on_page: performance.now()
          });
        } else {
          analytics.track('page_view', {
            event: 'page_visible',
            return_time: performance.now()
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableAnalytics]);

  useEffect(() => {
    // Track errors globally
    const handleError = (event: ErrorEvent) => {
      if (enableErrorTracking) {
        captureError({
          message: event.message,
          stack: event.error?.stack,
          type: 'javascript',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (enableErrorTracking) {
        captureError({
          message: event.reason?.message || 'Unhandled Promise Rejection',
          stack: event.reason?.stack,
          type: 'unhandled_rejection'
        });
      }
    };

    if (enableErrorTracking) {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      if (enableErrorTracking) {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [enableErrorTracking, captureError]);

  // Show critical alerts in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && unresolvedAlerts.length > 0) {
      const criticalAlerts = unresolvedAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        console.group('🚨 Critical Monitoring Alerts');
        criticalAlerts.forEach(alert => {
          console.error(`${alert.type}: ${alert.message}`, alert.metadata);
        });
        console.groupEnd();
      }
    }
  }, [unresolvedAlerts]);

  if (!isMonitoringReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

// Hook for easy access to monitoring services
export function useMonitoring() {
  const { track, trackBusinessView, trackSearchPerformed } = useAnalytics();
  const { measureApiCall } = usePerformanceMonitoring();
  const { captureError, captureApiError } = useErrorTracking();
  const { metrics, alerts, resolveAlert } = useRealTimeMonitoring();

  return {
    // Analytics
    track,
    trackBusinessView,
    trackSearchPerformed,
    
    // Performance
    measureApiCall,
    
    // Error Tracking
    captureError,
    captureApiError,
    
    // Real-time
    metrics,
    alerts,
    resolveAlert,
    
    // Combined methods
    trackWithPerformance: (event: AnalyticsEvent, properties?: any) => {
      const startTime = performance.now();
      track(event, properties);
      return () => {
        const duration = performance.now() - startTime;
        console.log(`Event ${event} took ${duration}ms`);
      };
    }
  };
}

// Higher-order component for automatic monitoring
export function withMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    trackPageView?: boolean;
    trackPerformance?: boolean;
    trackErrors?: boolean;
    componentName?: string;
  } = {}
) {
  const WrappedComponent = (props: P) => {
    const { trackPageView = true, trackPerformance = true, trackErrors = true, componentName } = options;
    const { track, measureApiCall, captureError } = useMonitoring();

    useEffect(() => {
      if (trackPageView) {
        track('page_view', {
          component: componentName || Component.name,
          props: Object.keys(props)
        });
      }
    }, []);

    const monitoredComponent = React.createElement(Component, props);

    if (trackErrors) {
      return (
        <ErrorBoundary fallback={({ error }) => {
          captureError({
            message: error.message,
            stack: error.stack,
            type: 'react',
            context: { component: componentName || Component.name }
          });
          return (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="text-red-800 font-semibold">Component Error</h3>
              <p className="text-red-600 text-sm mt-1">
                {componentName || Component.name} encountered an error
              </p>
            </div>
          );
        }}>
          {monitoredComponent}
        </ErrorBoundary>
      );
    }

    return monitoredComponent;
  };

  WrappedComponent.displayName = `withMonitoring(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Export monitoring provider as default
export default MonitoringProvider;

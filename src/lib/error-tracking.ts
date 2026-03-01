'use client';

import React from 'react';

// Error tracking and monitoring service
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  type: 'javascript' | 'network' | 'api' | 'react' | 'unhandled_rejection';
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context?: {
    component?: string;
    action?: string;
    route?: string;
    [key: string]: any;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  occurrences: number;
}

class ErrorTrackingService {
  private errors: Map<string, ErrorReport> = new Map();
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized = false;
  private static readonly FETCH_PATCH_FLAG = '__errorTrackingFetchPatched__';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return `error_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    this.isInitialized = true;
    this.setupGlobalErrorHandlers();
    // Opt-in only: global fetch monkey-patching can interfere with Next.js RSC internals.
    if (process.env.NEXT_PUBLIC_ENABLE_FETCH_ERROR_TRACKING === 'true') {
      this.setupNetworkErrorTracking();
    }
    this.setupReactErrorTracking();
  }

  private setupGlobalErrorHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      // Skip Server Actions and internal Next.js errors
      if (this.isInternalError(event.message, event.filename)) {
        return;
      }
      
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Skip Server Actions errors
      if (this.isInternalError(event.reason?.message || '')) {
        return;
      }
      
      this.captureError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        type: 'unhandled_rejection'
      });
    });
  }

  private isInternalError(message: string, filename?: string): boolean {
    // Skip Server Actions and internal Next.js errors
    return message.includes('Invalid Server Actions request') ||
           message.includes('Server Actions') ||
           (filename && filename.includes('/_next/')) ||
           message.includes('x-forwarded-host') ||
           message.includes('origin header');
  }

  private setupNetworkErrorTracking() {
    if ((window as Window & { __errorTrackingFetchPatched__?: boolean })[ErrorTrackingService.FETCH_PATCH_FLAG]) {
      return;
    }

    // Override fetch to track network errors
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = this.getRequestUrl(input);

      try {
        const response = await originalFetch(input, init);
        
        // Skip tracking for Server Actions and internal Next.js requests
        if (this.isInternalRequest(url)) {
          return response;
        }
        
        // Track HTTP errors
        if (!response.ok) {
          this.captureError({
            message: `HTTP Error: ${response.status} ${response.statusText}`,
            type: 'network',
            context: {
              url,
              method: init?.method || 'GET',
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : (error as any)?.message || 'Unknown network error';
        const errorStack = error instanceof Error ? error.stack : (error as any)?.stack;
        
        // Skip tracking for internal requests that fail
        if (this.isInternalRequest(url)) {
          throw error;
        }
        
        this.captureError({
          message: `Network Error: ${errorMessage}`,
          stack: errorStack,
          type: 'network',
          context: {
            url,
            method: init?.method || 'GET'
          }
        });
        throw error;
      }
    };
    (window as Window & { __errorTrackingFetchPatched__?: boolean })[ErrorTrackingService.FETCH_PATCH_FLAG] = true;
  }

  private getRequestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    if (input && typeof input === 'object' && 'url' in input && typeof (input as { url?: unknown }).url === 'string') {
      return (input as { url: string }).url;
    }
    return '';
  }

  private isInternalRequest(url: string): boolean {
    if (!url) return false;

    let pathname = '';
    let hasRscQuery = false;
    try {
      const parsed = new URL(url, window.location.origin);
      pathname = parsed.pathname;
      hasRscQuery = parsed.searchParams.has('_rsc');
    } catch {
      pathname = url;
    }

    // Skip Server Actions and internal Next.js requests
    return pathname.includes('/_next/') ||
           hasRscQuery ||
           url.includes('__next') ||
           url.includes('server-actions') ||
           url.includes('api/auth') ||
           (url.includes('localhost') && url.includes('9002')) ||
           (url.includes('127.0.0.1') && url.includes('49766'));
  }

  private setupReactErrorTracking() {
    // React Error Boundary support
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.error && event.error.toString().includes('React')) {
          this.captureError({
            message: (event.error as Error).message,
            stack: (event.error as Error).stack,
            type: 'react'
          });
        }
      });
    }
  }

  private generateErrorId(error: { message: string; type: string }): string {
    const base = `${error.type}_${error.message}`;
    return btoa(base).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  private determineSeverity(error: { type: 'javascript' | 'network' | 'api' | 'react' | 'unhandled_rejection'; message: string; context?: any }): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors that break the app
    if (error.type === 'javascript' && error.message.includes('Cannot read property')) {
      return 'critical';
    }
    
    // High severity errors
    if (error.type === 'network' && error.context?.status >= 500) {
      return 'high';
    }
    
    // Medium severity
    if (error.type === 'api' || error.type === 'react') {
      return 'medium';
    }
    
    // Low severity
    return 'low';
  }

  captureError(error: {
    message: string;
    stack?: string;
    type: 'javascript' | 'network' | 'api' | 'react' | 'unhandled_rejection';
    filename?: string;
    lineno?: number;
    colno?: number;
    context?: any;
  }) {
    if (!this.isInitialized) return;

    const errorId = this.generateErrorId(error);
    const existingError = this.errors.get(errorId);

    if (existingError) {
      // Increment occurrence count
      existingError.occurrences++;
      existingError.timestamp = new Date().toISOString();
    } else {
      // Create new error report
      const errorReport: ErrorReport = {
        id: errorId,
        message: error.message,
        stack: error.stack,
        type: error.type,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: this.userId || undefined,
        sessionId: this.sessionId,
        context: {
          ...error.context,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          route: window.location.pathname
        },
        severity: this.determineSeverity(error),
        resolved: false,
        occurrences: 1
      };

      this.errors.set(errorId, errorReport);
      this.sendToMonitoringService(errorReport);
    }

    // Log to console in development (filter out low-severity network errors)
    if (process.env.NODE_ENV === 'development') {
      const severity = this.determineSeverity(error);
      // Only log medium/high/critical severity errors to avoid console spam
      if (severity !== 'low') {
        console.error('Error captured:', error?.message || error || 'Unknown error', `(Severity: ${severity})`);
      }
    }
  }

  private async sendToMonitoringService(errorReport: ErrorReport) {
    try {
      // Send to Supabase error tracking table
      if (typeof window !== 'undefined' && window.supabase) {
        // Match DB column naming (snake_case).
        const dbRow = {
          id: errorReport.id,
          message: errorReport.message,
          stack: errorReport.stack,
          type: errorReport.type,
          timestamp: errorReport.timestamp,
          url: errorReport.url,
          user_agent: errorReport.userAgent,
          user_id: errorReport.userId || null,
          session_id: errorReport.sessionId,
          context: errorReport.context || {},
          severity: errorReport.severity,
          resolved: errorReport.resolved,
          occurrences: errorReport.occurrences,
        };

        const { error } = await window.supabase
          .from('error_reports')
          .insert(dbRow);
        
        if (error) {
          console.error('Failed to send error to database:', error);
        }
      }

      // Send to external monitoring service
      if (process.env.NEXT_PUBLIC_ERROR_WEBHOOK) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport)
        });
      }

      // Send to Sentry if configured
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(new Error(errorReport.message), {
          tags: {
            type: errorReport.type,
            severity: errorReport.severity
          },
          extra: errorReport.context
        });
      }
    } catch (err) {
      console.error('Failed to send error report:', err);
    }
  }

  // Public API
  setUser(userId: string) {
    this.userId = userId;
  }

  captureApiError(endpoint: string, error: any, context?: any) {
    this.captureError({
      message: `API Error: ${endpoint} - ${error?.message || error || 'Unknown API error'}`,
      stack: error?.stack,
      type: 'api',
      context: {
        endpoint,
        ...context
      }
    });
  }

  captureCustomError(message: string, type: string, context?: any) {
    // Ensure the type is one of the allowed types, default to 'javascript' if not
    const validType = ['javascript', 'network', 'api', 'react', 'unhandled_rejection'].includes(type) 
      ? type as 'javascript' | 'network' | 'api' | 'react' | 'unhandled_rejection'
      : 'javascript';
    
    this.captureError({
      message: message || 'Unknown error',
      type: validType,
      context
    });
  }

  getErrors(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  getUnresolvedErrors(): ErrorReport[] {
    return this.getErrors().filter(error => !error.resolved);
  }

  getErrorsByType(type: string): ErrorReport[] {
    return this.getErrors().filter(error => error.type === type);
  }

  getErrorsBySeverity(severity: string): ErrorReport[] {
    return this.getErrors().filter(error => error.severity === severity);
  }

  markErrorResolved(errorId: string) {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      this.sendToMonitoringService(error);
    }
  }

  clearErrors() {
    this.errors.clear();
  }

  generateErrorReport(): string {
    const errors = this.getUnresolvedErrors();
    const totalErrors = errors.length;
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;

    return `
Error Report - ${new Date().toISOString()}
=====================================
Total Unresolved Errors: ${totalErrors}
Critical Errors: ${criticalErrors}
High Severity Errors: ${highErrors}

Top Errors by Occurrences:
${errors
  .sort((a, b) => b.occurrences - a.occurrences)
  .slice(0, 10)
  .map(error => `- ${error.message} (${error.occurrences} occurrences)`)
  .join('\n')}
    `.trim();
  }
}

// Singleton instance
export const errorTracker = new ErrorTrackingService();

// React hook for error tracking
export function useErrorTracking() {
  return {
    captureError: errorTracker.captureError.bind(errorTracker),
    captureApiError: errorTracker.captureApiError.bind(errorTracker),
    captureCustomError: errorTracker.captureCustomError.bind(errorTracker),
    getErrors: errorTracker.getErrors.bind(errorTracker),
    getUnresolvedErrors: errorTracker.getUnresolvedErrors.bind(errorTracker),
    markErrorResolved: errorTracker.markErrorResolved.bind(errorTracker),
    setUser: errorTracker.setUser.bind(errorTracker)
  };
}

// Error Boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorTracker.captureError({
      message: error.message,
      stack: error.stack,
      type: 'react',
      context: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return React.createElement(FallbackComponent, { error: this.state.error! });
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return React.createElement('div', {
    className: 'min-h-screen flex items-center justify-center bg-gray-50'
  }, [
    React.createElement('div', {
      key: 'container',
      className: 'max-w-md w-full bg-white rounded-lg shadow-lg p-6'
    }, [
      React.createElement('h2', {
        key: 'title',
        className: 'text-2xl font-bold text-red-600 mb-4'
      }, 'Something went wrong'),
      React.createElement('p', {
        key: 'description',
        className: 'text-gray-600 mb-4'
      }, 'We are sorry, but something unexpected happened.'),
      React.createElement('details', {
        key: 'details',
        className: 'text-sm text-gray-500'
      }, [
        React.createElement('summary', { key: 'summary' }, 'Error details'),
        React.createElement('pre', {
          key: 'stack',
          className: 'mt-2 p-2 bg-gray-100 rounded overflow-auto'
        }, error.stack)
      ]),
      React.createElement('button', {
        key: 'button',
        onClick: () => window.location.reload(),
        className: 'mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700'
      }, 'Reload Page')
    ])
  ]);
}

// Extend Window interface
declare global {
  interface Window {
    supabase?: any;
    Sentry?: any;
    __errorTrackingFetchPatched__?: boolean;
  }
}

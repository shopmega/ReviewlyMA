# Advanced Monitoring & Analytics Setup Guide

This guide covers the implementation of advanced monitoring, analytics, and business intelligence for the Avis platform.

## Overview

The advanced monitoring system includes:
- **User Behavior Analytics**: Track user interactions, conversions, and funnel analysis
- **Performance Monitoring**: Core Web Vitals, API response times, and system performance
- **Error Tracking**: Comprehensive error capture, reporting, and alerting
- **Real-time Monitoring**: Live metrics, alerts, and system health
- **Business Intelligence**: Analytics dashboard with comprehensive insights

## 🚀 Quick Start

### 1. Database Setup

Run the analytics schema to create the necessary tables:

```sql
-- Run in Supabase SQL editor
\i supabase/analytics-schema.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```env
# Analytics Webhook (for real-time alerts)
NEXT_PUBLIC_ANALYTICS_WEBHOOK=https://your-webhook-url.com/analytics

# Performance Monitoring Webhook
NEXT_PUBLIC_PERFORMANCE_WEBHOOK=https://your-webhook-url.com/performance

# Error Tracking Webhook
NEXT_PUBLIC_ERROR_WEBHOOK=https://your-webhook-url.com/errors

# Real-time Monitoring WebSocket
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-server.com/monitoring

# Google Analytics 4 (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry DSN (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 3. Integration

Wrap your app with the `MonitoringProvider`:

```tsx
// src/app/layout.tsx
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <MonitoringProvider userId={user?.id}>
          {children}
        </MonitoringProvider>
      </body>
    </html>
  );
}
```

## 📊 Analytics Features

### User Behavior Tracking

The system automatically tracks:
- Page views and navigation
- User interactions (clicks, scrolls)
- Search queries and filters
- Business views and reviews
- Conversion events

#### Custom Event Tracking

```tsx
import { useMonitoring } from '@/components/providers/MonitoringProvider';

function MyComponent() {
  const { track, trackBusinessView, trackSearchPerformed } = useMonitoring();

  const handleBusinessClick = (businessId: string) => {
    trackBusinessView(businessId, 'Business Name', 'Restaurants');
  };

  const handleSearch = (query: string, filters: any) => {
    trackSearchPerformed(query, filters, 25);
  };

  const trackCustomEvent = () => {
    track('custom_event', {
      button_name: 'cta_button',
      location: 'homepage_hero'
    });
  };

  return (
    // Your component JSX
  );
}
```

### Performance Monitoring

Automatic collection of:
- Core Web Vitals (LCP, FID, CLS, FCP)
- API response times
- Page load performance
- Memory usage
- User interaction delays

#### Performance Tracking

```tsx
import { usePerformanceMonitoring } from '@/lib/performance-monitoring';

function ApiComponent() {
  const { measureApiCall } = usePerformanceMonitoring();

  const fetchData = async () => {
    const response = await withPerformanceTracking(
      () => fetch('/api/businesses'),
      'fetch_businesses'
    );
    return response.json();
  };

  return (
    // Your component JSX
  );
}
```

### Error Tracking

Comprehensive error capture:
- JavaScript errors
- Network failures
- API errors
- React component errors
- Unhandled promise rejections

#### Error Tracking Usage

```tsx
import { useErrorTracking } from '@/lib/error-tracking';

function MyComponent() {
  const { captureError, captureApiError } = useMonitoring();

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        captureApiError('/api/data', new Error('API failed'), { userId: '123' });
      }
    } catch (error) {
      captureError(error as Error, 'api_call', { endpoint: '/api/data' });
    }
  };

  return (
    // Your component JSX
  );
}
```

### Real-time Monitoring

Live monitoring features:
- Active user count
- Server load metrics
- Response time tracking
- Error rate monitoring
- Automated alerting

#### Real-time Dashboard

```tsx
import { useRealTimeMonitoring } from '@/lib/real-time-monitoring';

function MonitoringDashboard() {
  const { metrics, alerts, resolveAlert } = useRealTimeMonitoring();

  return (
    <div>
      <h2>Live Metrics</h2>
      <p>Active Users: {metrics[metrics.length - 1]?.activeUsers}</p>
      <p>Response Time: {metrics[metrics.length - 1]?.responseTime}ms</p>
      
      <h3>Alerts</h3>
      {alerts.map(alert => (
        <div key={alert.id}>
          <span>{alert.message}</span>
          <button onClick={() => resolveAlert(alert.id)}>Resolve</button>
        </div>
      ))}
    </div>
  );
}
```

## 📈 Business Intelligence Dashboard

Access the comprehensive analytics dashboard at `/admin/analytics`:

### Key Features

1. **Overview Metrics**
   - Total users and active users
   - Business count and reviews
   - Average ratings and conversion rates

2. **User Analytics**
   - Daily active users
   - User growth trends
   - Retention rates
   - Demographic breakdown

3. **Business Analytics**
   - Business growth over time
   - Category distribution
   - Top performing categories
   - Claimed business metrics

4. **Performance Analytics**
   - Page load times
   - Error rates
   - Core Web Vitals
   - Top pages by engagement

5. **Revenue Analytics**
   - Monthly revenue trends
   - Subscription breakdown
   - Churn rates
   - Customer lifetime value

## 🔧 Advanced Configuration

### Custom Analytics Events

```tsx
// Track custom business events
analytics.trackBusinessClaimed(businessId, businessName);
analytics.trackPremiumSubscription('premium_annual', 5000);
analytics.trackFilterApplied('category', 'restaurants');
analytics.trackBusinessSaved(businessId, businessName);
```

### Performance Thresholds

```tsx
// Custom performance thresholds
const customThresholds = {
  lcp: 1500,        // Faster than default 2500ms
  fid: 50,          // Faster than default 100ms
  cls: 0.05,        // Better than default 0.1
  apiResponseTime: 500 // Faster than default 1000ms
};
```

### Error Severity Levels

```tsx
// Custom error severity determination
errorTracker.captureCustomError(
  'Custom error message',
  'business_logic',
  { component: 'BusinessCard', severity: 'high' }
);
```

## 📱 Mobile App Integration

For React Native or mobile apps:

```tsx
import { analytics } from '@/lib/analytics';

// Initialize for mobile
analytics.initialize({
  platform: 'mobile',
  version: '1.0.0',
  userId: 'mobile-user-123'
});

// Track mobile-specific events
analytics.track('app_open', {
  platform: 'ios',
  version: '1.0.0'
});
```

## 🔔 Alert Configuration

### Webhook Integration

Set up webhooks to receive real-time alerts:

```javascript
// Example webhook handler
app.post('/webhook/analytics', (req, res) => {
  const { event, userId, businessId, properties } = req.body;
  
  // Process analytics event
  console.log(`Analytics event: ${event} from user ${userId}`);
  
  // Send to Slack, Discord, etc.
  if (event === 'error_rate' && properties.errorRate > 5) {
    sendSlackAlert(`High error rate: ${properties.errorRate}%`);
  }
  
  res.status(200).send('OK');
});
```

### Alert Types

1. **Performance Alerts**
   - High response times (>2s)
   - Low Core Web Vitals scores
   - High error rates (>5%)

2. **Business Alerts**
   - Unusual user activity drops
   - High server load (>80%)
   - Failed payment processing

3. **System Alerts**
   - Database connection issues
   - WebSocket disconnections
   - Memory usage warnings

## 📊 Data Export & Reporting

### Export Analytics Data

```tsx
// Export from dashboard
const exportData = () => {
  const csvContent = generateCSV(analyticsData);
  downloadFile(csvContent, 'analytics-export.csv');
};
```

### Automated Reports

```sql
-- Weekly business performance report
SELECT 
  b.name,
  COUNT(*) as views,
  AVG(rating) as avg_rating,
  COUNT(DISTINCT r.id) as reviews
FROM business_analytics ba
JOIN businesses b ON ba.business_id = b.id
LEFT JOIN reviews r ON b.id = r.business_id
WHERE ba.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY b.id, b.name
ORDER BY views DESC;
```

## 🔒 Privacy & Security

### Data Anonymization

```tsx
// Anonymize sensitive data
analytics.track('page_view', {
  page: '/businesses/123', // Will be anonymized
  user_ip: null, // Never track IPs
  user_email: null // Never track emails
});
```

### GDPR Compliance

- User data deletion on request
- Data retention policies
- Consent management
- Right to be forgotten

## 🚀 Production Deployment

### 1. Database Migration

```bash
# Apply analytics schema
supabase db push supabase/analytics-schema.sql
```

### 2. Environment Setup

```bash
# Production environment variables
NEXT_PUBLIC_ANALYTICS_WEBHOOK=https://api.yourdomain.com/webhooks/analytics
NEXT_PUBLIC_PERFORMANCE_WEBHOOK=https://api.yourdomain.com/webhooks/performance
NEXT_PUBLIC_ERROR_WEBHOOK=https://api.yourdomain.com/webhooks/errors
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.yourdomain.com/monitoring
```

### 3. Monitoring Setup

```bash
# Start monitoring services
npm run monitoring:start

# Or integrate with existing monitoring
npm run build
npm run start
```

## 📈 Scaling Considerations

### Database Optimization

```sql
-- Partition large tables by date
CREATE TABLE analytics_events_2026_01 PARTITION OF analytics_events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Create materialized views for common queries
CREATE MATERIALIZED VIEW daily_analytics_summary AS
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
GROUP BY DATE(timestamp);
```

### Caching Strategy

```tsx
// Cache analytics data
const getCachedAnalytics = async (key: string) => {
  const cached = await redis.get(`analytics:${key}`);
  if (cached) return JSON.parse(cached);
  
  const fresh = await fetchAnalytics(key);
  await redis.setex(`analytics:${key}`, 300, JSON.stringify(fresh));
  return fresh;
};
```

## 🛠️ Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WebSocket URL configuration
   - Verify firewall settings
   - Use HTTP polling fallback

2. **High Memory Usage**
   - Implement data retention policies
   - Use pagination for large datasets
   - Optimize database queries

3. **Missing Analytics Data**
   - Verify MonitoringProvider integration
   - Check environment variables
   - Review browser console for errors

### Debug Mode

```tsx
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  analytics.setDebugMode(true);
  performanceMonitor.setDebugMode(true);
  errorTracker.setDebugMode(true);
}
```

## 📚 API Reference

### Analytics Service

```typescript
interface AnalyticsService {
  track(event: AnalyticsEvent, properties?: any, businessId?: string): void;
  trackBusinessView(businessId: string, businessName?: string, category?: string): void;
  trackSearchPerformed(query: string, filters: any, resultCount: number): void;
  trackReviewSubmitted(businessId: string, rating: number, category?: string): void;
  trackBusinessClaimed(businessId: string, businessName?: string): void;
  trackPremiumSubscription(plan: string, price: number): void;
  setUser(user: User | null): void;
}
```

### Performance Monitor

```typescript
interface PerformanceMonitor {
  measurePageLoad(pageName?: string): void;
  measureApiCall(endpoint: string, startTime: number): void;
  getMetrics(): PerformanceMetrics[];
  getAverageMetrics(): Partial<PerformanceMetrics>;
}
```

### Error Tracker

```typescript
interface ErrorTracker {
  captureError(error: ErrorData): void;
  captureApiError(endpoint: string, error: any, context?: any): void;
  captureCustomError(message: string, type: string, context?: any): void;
  getErrors(): ErrorReport[];
  markErrorResolved(errorId: string): void;
}
```

## 🎯 Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Property Structure**: Keep properties flat and well-typed
3. **Performance**: Avoid blocking the main thread
4. **Privacy**: Never track sensitive user information
5. **Testing**: Test monitoring in development before production

## 📞 Support

For issues with the monitoring system:

1. Check browser console for errors
2. Verify environment variables
3. Review network requests in dev tools
4. Check database connection and permissions
5. Review this documentation for common solutions

---

*This monitoring system provides comprehensive insights into your platform's performance, user behavior, and business metrics. Configure according to your specific needs and scale as your platform grows.*

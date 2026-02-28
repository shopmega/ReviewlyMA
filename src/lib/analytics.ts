'use client';

import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

// Analytics event types
export type AnalyticsEvent =
  | 'page_view'
  | 'business_view'
  | 'search_performed'
  | 'cta_click'
  | 'review_submitted'
  | 'business_claimed'
  | 'user_registered'
  | 'premium_subscribed'
  | 'widget_embedded'
  | 'contact_form_submitted'
  | 'filter_applied'
  | 'business_saved'
  | 'carousel_click'
  | 'carousel_impression';

export interface AnalyticsData {
  event: AnalyticsEvent;
  user_id?: string;
  business_id?: string;
  session_id: string;
  timestamp: string;
  properties?: Record<string, any>;
  metadata: {
    userAgent: string;
    url: string;
    referrer: string;
    screenSize: string;
    locale: string;
  };
}

class AnalyticsService {
  private supabase: any;
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeSupabase();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeSupabase() {
    try {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      this.isInitialized = true;
    } catch (error) {
      console.error('Analytics service initialization failed:', error);
    }
  }

  setUser(user: User | null) {
    this.userId = user?.id || null;
  }

  private getMetadata() {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'server',
        url: '',
        referrer: '',
        screenSize: 'server',
        locale: 'fr-MA'
      };
    }

    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      locale: navigator.language || 'fr-MA'
    };
  }

  async track(event: AnalyticsEvent, properties?: Record<string, any>, businessId?: string) {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized, skipping event tracking');
      return;
    }

    const analyticsData: AnalyticsData = {
      event,
      user_id: this.userId || undefined,
      business_id: businessId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      properties,
      metadata: this.getMetadata()
    };

    try {
      // Store in Supabase analytics table
      const { error } = await this.supabase
        .from('analytics_events')
        .insert(analyticsData);

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205') {
          console.warn(`Analytics table missing for event "${event}", skipping. Please run migrations.`);
        } else {
          console.error('Analytics tracking failed:', error);
        }
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }

    // Also send to external analytics if configured
    this.sendToExternalAnalytics(analyticsData);
  }

  private sendToExternalAnalytics(data: AnalyticsData) {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', data.event, {
        user_id: data.user_id,
        business_id: data.business_id,
        session_id: data.session_id,
        custom_parameters: data.properties
      });
    }

    // Optional Google Ads conversion tracking (when conversion labels are configured).
    if (typeof window !== 'undefined' && window.gtag) {
      const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
      const conversionLabel = this.getGoogleAdsConversionLabel(data.event);

      if (googleAdsId && conversionLabel) {
        const maybeValue = data.properties?.value ?? data.properties?.price;
        const numericValue = typeof maybeValue === 'number' ? maybeValue : undefined;
        const currency =
          typeof data.properties?.currency === 'string' ? data.properties.currency : 'MAD';

        window.gtag('event', 'conversion', {
          send_to: `${googleAdsId}/${conversionLabel}`,
          value: numericValue,
          currency,
          transaction_id: data.properties?.transaction_id ?? undefined,
        });
      }
    }

    // Custom webhook for real-time monitoring
    if (process.env.NEXT_PUBLIC_ANALYTICS_WEBHOOK) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {
        // Silently fail webhook requests
      });
    }
  }

  // Business-specific analytics
  trackBusinessView(businessId: string, businessName?: string, category?: string) {
    this.track('business_view', {
      business_name: businessName,
      category
    }, businessId);
  }

  trackSearchPerformed(query: string, filters: Record<string, any>, resultCount: number) {
    this.track('search_performed', {
      query,
      filters,
      result_count: resultCount
    });
  }

  trackReviewSubmitted(businessId: string, rating: number, category?: string) {
    this.track('review_submitted', {
      rating,
      category
    }, businessId);
  }

  trackBusinessClaimed(businessId: string, businessName?: string) {
    this.track('business_claimed', {
      business_name: businessName
    }, businessId);
  }

  trackPremiumSubscription(plan: string, price: number) {
    this.track('premium_subscribed', {
      plan,
      price
    });
  }

  trackFilterApplied(filterType: string, filterValue: string) {
    this.track('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue
    });
  }

  trackBusinessSaved(businessId: string, businessName?: string) {
    this.track('business_saved', {
      business_name: businessName
    }, businessId);
  }

  private getGoogleAdsConversionLabel(event: AnalyticsEvent): string | null {
    switch (event) {
      case 'premium_subscribed':
        return process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PREMIUM_SUBSCRIBED || null;
      case 'business_claimed':
        return process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_BUSINESS_CLAIMED || null;
      case 'user_registered':
        return process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_USER_REGISTERED || null;
      case 'review_submitted':
        return process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_REVIEW_SUBMITTED || null;
      default:
        return null;
    }
  }

  trackCtaClick(
    ctaId: string,
    placement: string,
    context: string,
    experimentName?: string,
    variant?: string,
    businessId?: string,
    extra?: Record<string, any>
  ) {
    this.track('cta_click', {
      cta_id: ctaId,
      placement,
      context,
      experiment_name: experimentName,
      variant,
      ...extra,
    }, businessId);
  }

  async trackCarouselClick(collectionId: string, collectionTitle: string, collectionSubtitle: string, linkType: string, linkDestination: string, position: number) {
    // Track in main analytics
    this.track('carousel_click', {
      collection_id: collectionId,
      collection_title: collectionTitle,
      collection_subtitle: collectionSubtitle,
      link_type: linkType,
      link_destination: linkDestination,
      position
    });

    // Also track in dedicated carousel analytics table
    if (this.isInitialized && this.supabase) {
      try {
        const { error } = await this.supabase
          .from('carousel_analytics')
          .insert({
            collection_id: collectionId,
            event_type: 'click',
            user_id: this.userId,
            session_id: this.sessionId,
            metadata: {
              collection_title: collectionTitle,
              collection_subtitle: collectionSubtitle,
              link_type: linkType,
              link_destination: linkDestination,
              position
            }
          });

        if (error) {
          if (error.code === 'PGRST204' || error.code === 'PGRST205') {
            console.warn('Carousel analytics table missing, skipping. Please run migrations.');
          } else {
            console.error('Carousel analytics tracking failed:', error);
          }
        }
      } catch (error) {
        console.error('Carousel analytics tracking error:', error);
      }
    }
  }

  async trackCarouselImpression(collectionId: string, collectionTitle: string, position: number) {
    // Track in main analytics
    this.track('carousel_impression', {
      collection_id: collectionId,
      collection_title: collectionTitle,
      position
    });

    // Also track in dedicated carousel analytics table
    if (this.isInitialized && this.supabase) {
      try {
        const { error } = await this.supabase
          .from('carousel_analytics')
          .insert({
            collection_id: collectionId,
            event_type: 'impression',
            user_id: this.userId,
            session_id: this.sessionId,
            metadata: {
              collection_title: collectionTitle,
              position
            }
          });

        if (error) {
          if (error.code === 'PGRST204' || error.code === 'PGRST205') {
            console.warn('Carousel analytics table missing, skipping. Please run migrations.');
          } else {
            console.error('Carousel impression tracking failed:', error);
          }
        }
      } catch (error) {
        console.error('Carousel impression tracking error:', error);
      }
    }
  }

  // Performance tracking
  trackPageLoadTime(page: string, loadTime: number) {
    this.track('page_view', {
      page,
      load_time_ms: loadTime
    });
  }

  trackUserEngagement(timeSpent: number, interactions: number) {
    this.track('page_view', {
      time_spent_seconds: timeSpent,
      interactions
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// React hook for analytics
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackBusinessView: analytics.trackBusinessView.bind(analytics),
    trackSearchPerformed: analytics.trackSearchPerformed.bind(analytics),
    trackReviewSubmitted: analytics.trackReviewSubmitted.bind(analytics),
    trackBusinessClaimed: analytics.trackBusinessClaimed.bind(analytics),
    trackPremiumSubscription: analytics.trackPremiumSubscription.bind(analytics),
    trackFilterApplied: analytics.trackFilterApplied.bind(analytics),
    trackBusinessSaved: analytics.trackBusinessSaved.bind(analytics),
    trackCtaClick: analytics.trackCtaClick.bind(analytics),
    trackPageLoadTime: analytics.trackPageLoadTime.bind(analytics),
    trackUserEngagement: analytics.trackUserEngagement.bind(analytics),
    setUser: analytics.setUser.bind(analytics)
  };
}

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

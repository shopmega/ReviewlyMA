'use client';

import Script from 'next/script';
import { useEffect } from 'react';

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

interface GoogleAnalyticsProps {
  gaId?: string;
  adminGaId?: string;
}

export function GoogleAnalytics({ gaId, adminGaId }: GoogleAnalyticsProps) {
  // Load GA ID with priority: prop > admin setting > environment variable
  const googleAnalyticsId = gaId || adminGaId || process.env.NEXT_PUBLIC_GA_ID;
  
  // Debug logging
  if (typeof window !== "undefined") {
    console.log("GA Component Debug:", {
      gaId,
      adminGaId,
      envGaId: process.env.NEXT_PUBLIC_GA_ID,
      resolvedId: googleAnalyticsId,
      hasId: !!googleAnalyticsId
    });
  }

  useEffect(() => {
    // Initialize gtag if GA ID is available
    if (googleAnalyticsId && typeof window !== 'undefined') {
      // @ts-ignore - gtag is loaded by the script
      if (typeof window.gtag !== 'undefined') {
        // Configure gtag with the GA ID
        window.gtag('config', googleAnalyticsId, {
          page_title: document.title,
          page_location: window.location.href,
        });
      }
    }
  }, [googleAnalyticsId]);

  if (!googleAnalyticsId) {
    return null;
  }

  return (
    <>
      {/* Load Google Analytics script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        onError={() => {
          console.error('Failed to load Google Analytics script');
        }}
      />
      
      {/* Initialize gtag */}
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

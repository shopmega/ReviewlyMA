'use client';

import Script from 'next/script';

interface AnalyticsConfigProps {
  gaId?: string;
  metaPixelId?: string;
  googleAdsId?: string;
  requireConsent?: boolean;
}

export function AnalyticsConfig({ 
  gaId, 
  metaPixelId,
  googleAdsId,
  requireConsent
}: AnalyticsConfigProps) {
  // Load analytics IDs from environment variables (primary source)
  const googleAnalyticsId = gaId || process.env.NEXT_PUBLIC_GA_ID;
  const facebookPixelId = metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const googleAdsTagId = googleAdsId || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const gtagScriptId = googleAnalyticsId || googleAdsTagId;
  const shouldRequireConsent = requireConsent ?? process.env.NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT === 'true';

  // Simple validation
  if (!googleAnalyticsId && !facebookPixelId && !googleAdsTagId) {
    return null;
  }

  return (
    <>
      {/* Google Analytics */}
      {gtagScriptId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagScriptId}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('consent', 'default', {
                  analytics_storage: '${shouldRequireConsent ? 'denied' : 'granted'}',
                  ad_storage: '${shouldRequireConsent ? 'denied' : 'granted'}',
                  ad_user_data: '${shouldRequireConsent ? 'denied' : 'granted'}',
                  ad_personalization: '${shouldRequireConsent ? 'denied' : 'granted'}'
                });
                ${googleAnalyticsId ? `gtag('config', '${googleAnalyticsId}', { send_page_view: false });` : ''}
                ${googleAdsTagId ? `gtag('config', '${googleAdsTagId}');` : ''}

                // Optional bridge for a cookie banner/CMP to update consent at runtime.
                window.addEventListener('avis:tracking-consent', function(event) {
                  var detail = event && event.detail ? event.detail : {};
                  gtag('consent', 'update', {
                    analytics_storage: detail.analytics_storage || 'granted',
                    ad_storage: detail.ad_storage || 'granted',
                    ad_user_data: detail.ad_user_data || 'granted',
                    ad_personalization: detail.ad_personalization || 'granted'
                  });
                });
              `,
            }}
          />
        </>
      )}

      {/* Meta Pixel */}
      {facebookPixelId && (
        <>
          <Script
            id="fb-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${facebookPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
        </>
      )}
    </>
  );
}

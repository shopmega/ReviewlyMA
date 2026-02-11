'use client';

import Script from 'next/script';

interface AnalyticsConfigProps {
  gaId?: string;
  metaPixelId?: string;
}

export function AnalyticsConfig({ 
  gaId, 
  metaPixelId
}: AnalyticsConfigProps) {
  // Load analytics IDs from environment variables (primary source)
  const googleAnalyticsId = gaId || process.env.NEXT_PUBLIC_GA_ID;
  const facebookPixelId = metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Simple validation
  if (!googleAnalyticsId && !facebookPixelId) {
    return null;
  }

  return (
    <>
      {/* Google Analytics */}
      {googleAnalyticsId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
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
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConditionalFooter } from '@/components/layout/ConditionalFooter';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { getCachedSiteSettings } from '@/lib/cache';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { AnalyticsConfig } from '@/components/shared/AnalyticsConfig';
import { AnalyticsPageTracker } from '@/components/shared/AnalyticsPageTracker';
import { AdSense } from '@/components/shared/AdSense';
import { TrackingConsentBridge } from '@/components/shared/TrackingConsentBridge';
import { getServerSiteUrl } from '@/lib/site-config';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { getI18nState } from '@/lib/i18n/server';
import { isRtlLocale } from '@/lib/i18n/config';
import { cookies } from 'next/headers';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const plexHeadline = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-code',
  display: 'swap',
  weight: ['400', '500'],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSiteSettings();
  const siteUrl = getServerSiteUrl();
  const title = settings.site_name || 'CityGuide App';
  const description = settings.site_description || 'Decouvrez les meilleurs commerces de votre ville';
  const ogImage = '/opengraph-image';

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    icons: {
      icon: [
        { url: '/app-favicon.png', type: 'image/png' },
        { url: '/logo-mark.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico' },
      ],
      shortcut: ['/app-favicon.png'],
      apple: [{ url: '/app-logo.png' }],
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: siteUrl,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getCachedSiteSettings();
  const { locale, messages } = await getI18nState();
  const cookieStore = await cookies();
  const cspNonce = cookieStore.get('__csp_nonce')?.value;

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? 'rtl' : 'ltr'} className={cn("h-full", plexSans.variable, plexHeadline.variable, plexMono.variable)} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col')}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <I18nProvider locale={locale} messages={messages}>
              <BusinessProvider>
                <Header settings={settings} />
                <main className="flex-grow">{children}</main>
                <ConditionalFooter>
                  <Footer settings={settings} />
                </ConditionalFooter>
                <Toaster />
                <AnalyticsConfig
                  gaId={settings.google_analytics_id || undefined}
                  metaPixelId={settings.facebook_pixel_id || undefined}
                  nonce={cspNonce}
                />
                <TrackingConsentBridge />
                <AnalyticsPageTracker />
                <AdSense
                  enabled={settings.adsense_enabled ?? false}
                  pubId={settings.adsense_client_id || undefined}
                  autoAdsEnabled={settings.adsense_auto_ads_enabled ?? false}
                />
              </BusinessProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

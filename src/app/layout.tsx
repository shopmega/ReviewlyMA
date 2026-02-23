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
import { Inter, Outfit } from 'next/font/google';
import { AnalyticsConfig } from '@/components/shared/AnalyticsConfig';
import { AdSense } from '@/components/shared/AdSense';
import { getServerSiteUrl } from '@/lib/site-config';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { getI18nState } from '@/lib/i18n/server';
import { isRtlLocale } from '@/lib/i18n/config';
// Import RSC error handler to suppress Next.js 15 errors
import '@/lib/rsc-error-handler';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
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

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? 'rtl' : 'ltr'} className={cn("h-full", inter.variable, outfit.variable)} suppressHydrationWarning>
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
                <AnalyticsConfig />
                <AdSense />
              </BusinessProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}


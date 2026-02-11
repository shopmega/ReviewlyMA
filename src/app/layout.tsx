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

  return {
    metadataBase: new URL(siteUrl),
    title: settings.site_name || 'CityGuide App',
    description: settings.site_description || 'Découvrez les meilleurs commerces de votre ville',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getCachedSiteSettings();

  return (
    <html lang="fr" className={cn("h-full", inter.variable, outfit.variable)} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col')}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
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
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import '../globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AnalyticsConfig } from '@/components/shared/AnalyticsConfig';
import { AnalyticsPageTracker } from '@/components/shared/AnalyticsPageTracker';


export const metadata: Metadata = {
  title: 'Business Widget',
  robots: {
    index: false,
    follow: false,
  }
};

export default function WidgetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=PT+Sans:wght@400;700&family=Cairo:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('h-full bg-transparent font-body antialiased')}>
         <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <AnalyticsConfig />
          <AnalyticsPageTracker />
        </ThemeProvider>
      </body>
    </html>
  );
}

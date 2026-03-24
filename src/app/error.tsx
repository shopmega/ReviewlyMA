'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Locale = 'fr' | 'en';

const messages: Record<Locale, Record<string, string>> = {
  fr: {
    title: 'Une erreur est survenue',
    description: 'Une erreur inattendue s est produite. Veuillez reessayer ou revenir a l accueil.',
    technical: 'Details techniques (developpement)',
    retry: 'Reessayer',
    home: 'Retour a l accueil',
  },
  en: {
    title: 'An error occurred',
    description: 'An unexpected error occurred. Please try again or return to the home page.',
    technical: 'Technical details (development)',
    retry: 'Try again',
    home: 'Back to home',
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error occurred:', error);
  }, [error]);

  const locale: Locale = useMemo(() => {
    if (typeof document === 'undefined') return 'fr';
    const lang = document.documentElement.lang?.split('-')[0]?.toLowerCase();
    if (lang === 'en' || lang === 'fr') return lang;
    return 'fr';
  }, []);

  const t = messages[locale];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t.description}</p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">{t.technical}</summary>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="pt-4 flex flex-col gap-2">
            <Button onClick={() => reset()} className="w-full">
              {t.retry}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                {t.home}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

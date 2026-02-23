'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { APP_LOCALES, AppLocale, LOCALE_COOKIE_NAME, isRtlLocale } from '@/lib/i18n/config';
import type { AppMessages } from '@/lib/i18n/messages';

type I18nContextValue = {
  locale: AppLocale;
  locales: readonly AppLocale[];
  t: (key: string, fallback?: string) => string;
  tf: (key: string, fallback: string, vars: Record<string, string | number>) => string;
  setLocale: (locale: AppLocale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getMessage(messages: AppMessages, key: string): string | undefined {
  const parts = key.split('.');
  let value: unknown = messages;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !(part in value)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [name, value]) => {
    return acc.replaceAll(`{${name}}`, String(value));
  }, template);
}

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: AppLocale;
  messages: AppMessages;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (!APP_LOCALES.includes(nextLocale)) return;
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales: APP_LOCALES,
      setLocale,
      t: (key: string, fallback?: string) => getMessage(messages, key) ?? fallback ?? key,
      tf: (key: string, fallback: string, vars: Record<string, string | number>) =>
        interpolate(getMessage(messages, key) ?? fallback, vars),
    }),
    [locale, messages, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

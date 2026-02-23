export const APP_LOCALES = ['fr', 'en', 'ar'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'fr';
export const LOCALE_COOKIE_NAME = 'app_locale';

export function isValidLocale(value: string | null | undefined): value is AppLocale {
  return !!value && APP_LOCALES.includes(value as AppLocale);
}

export function isRtlLocale(locale: AppLocale): boolean {
  return locale === 'ar';
}


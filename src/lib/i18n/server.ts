import { cookies, headers } from 'next/headers';
import { APP_LOCALES, AppLocale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale } from './config';
import { AppMessages, MESSAGES_BY_LOCALE } from './messages';

function pickFromAcceptLanguage(raw: string | null): AppLocale {
  if (!raw) return DEFAULT_LOCALE;
  const candidates = raw
    .split(',')
    .map((entry) => entry.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (isValidLocale(candidate)) return candidate;
    const base = candidate.split('-')[0];
    if (isValidLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isValidLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  return pickFromAcceptLanguage(headerStore.get('accept-language'));
}

export async function getI18nState(): Promise<{ locale: AppLocale; messages: AppMessages }> {
  const locale = await getServerLocale();
  return { locale, messages: MESSAGES_BY_LOCALE[locale] };
}

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

export async function getServerTranslator() {
  const { locale, messages } = await getI18nState();
  return {
    locale,
    messages,
    t: (key: string, fallback?: string) => getMessage(messages, key) ?? fallback ?? key,
    tf: (key: string, fallback: string, vars: Record<string, string | number>) =>
      interpolate(getMessage(messages, key) ?? fallback, vars),
  };
}

export { APP_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME };

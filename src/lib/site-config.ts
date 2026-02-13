type SiteSettingsLike = {
  site_name?: string | null;
  email_from?: string | null;
  contact_email?: string | null;
};

const DEFAULT_SITE_URL = 'https://example.com';
const DEFAULT_SITE_NAME = 'Platform';
const DEFAULT_FROM_EMAIL = 'noreply@example.com';
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_SUPPORT_EMAIL = 'support@example.com';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getServerSiteUrl(): string {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      DEFAULT_SITE_URL
  );
}

export function getClientSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeUrl(window.location.origin);
  }

  return getServerSiteUrl();
}

export function getClientOAuthRedirectUrl(path = '/'): string {
  const baseUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : getServerSiteUrl())
  );

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function getSiteName(settings?: SiteSettingsLike | null): string {
  return settings?.site_name?.trim() || process.env.NEXT_PUBLIC_SITE_NAME || DEFAULT_SITE_NAME;
}

export function getFromEmail(settings?: SiteSettingsLike | null): string {
  return (
    settings?.email_from?.trim() ||
    process.env.EMAIL_FROM ||
    DEFAULT_FROM_EMAIL
  );
}

export function getSupportEmail(settings?: SiteSettingsLike | null): string {
  return (
    settings?.contact_email?.trim() ||
    settings?.email_from?.trim() ||
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_FROM ||
    DEFAULT_SUPPORT_EMAIL
  );
}

export function getAdminEmail(settings?: SiteSettingsLike | null): string {
  return (
    settings?.email_from?.trim() ||
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_FROM ||
    DEFAULT_ADMIN_EMAIL
  );
}

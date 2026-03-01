import { type NextRequest, NextResponse } from 'next/server'
// Use optimized middleware with caching
import { updateSession } from '@/lib/supabase/middleware-optimized'
import { APP_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale } from '@/lib/i18n/config';

// Security: Request size limit (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const CSP_NONCE_COOKIE = '__csp_nonce';

function isInternalNavigationRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/review') ||
    /^\/businesses\/[^/]+\/review\/?$/.test(pathname);

  if (request.nextUrl.searchParams.has('_rsc') && !isProtectedRoute) return true;
  if (request.headers.get('next-router-prefetch') === '1') return true;
  if (request.headers.get('x-middleware-prefetch') === '1') return true;

  const purpose = request.headers.get('purpose') || request.headers.get('sec-purpose') || '';
  return purpose.toLowerCase().includes('prefetch');
}

function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // Keep unsafe-inline fallback while migrating all inline scripts to nonce-only.
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://connect.facebook.net https://vercel.live`,
    `script-src-elem 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://connect.facebook.net https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: https://www.facebook.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://*.adtrafficquality.google",
    "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

function resolveLocaleFromRequest(request: NextRequest): (typeof APP_LOCALES)[number] {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidates = acceptLanguage
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

export async function middleware(request: NextRequest) {
  // Check request size for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new NextResponse('Payload too large', { 
        status: 413,
        statusText: 'Payload Too Large'
      });
    }
  }

  // Avoid auth/redirect/cookie logic on internal Next.js RSC and prefetch subrequests.
  if (isInternalNavigationRequest(request)) {
    return NextResponse.next();
  }

  const existingNonce = request.cookies.get(CSP_NONCE_COOKIE)?.value;
  const nonce = existingNonce || crypto.randomUUID().replace(/-/g, '');
  
  const response = await updateSession(request);
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  if (!existingNonce) {
    response.cookies.set(CSP_NONCE_COOKIE, nonce, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const localeCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (!isValidLocale(localeCookie)) {
    response.cookies.set(LOCALE_COOKIE_NAME, resolveLocaleFromRequest(request), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (Next data files)
     * - favicon.ico (favicon file)
     * - any file with an extension (e.g. .js, .css, .png)
     */
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\..*).*)',
  ],
}

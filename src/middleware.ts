import { type NextRequest, NextResponse } from 'next/server'
// Use optimized middleware with caching
import { updateSession } from '@/lib/supabase/middleware-optimized'
import { APP_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale } from '@/lib/i18n/config';

// Security: Request size limit (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

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
  
  const response = await updateSession(request);
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
     * - favicon.ico (favicon file)
     * - any file with an extension (e.g. .js, .css, .png)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}

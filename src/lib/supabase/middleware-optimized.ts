/**
 * Optimized Middleware with Caching
 * Reduces database queries by caching user profile and settings
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Simple in-memory cache (consider Redis for production with multiple instances)
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl,
  });
}

// Clean up expired cache entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (value.expires <= now) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run Supabase code on static assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname.startsWith('/api')
  ) {
    return supabaseResponse;
  }

  // Skip middleware for maintenance page itself
  if (request.nextUrl.pathname === '/maintenance') {
    return supabaseResponse;
  }

  // 1. Refresh session if expired with timeout resilience
  let user = null;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (!userError && data?.user) {
      user = data.user;
    }
  } catch (e) {
    // Log error but don't break the request
    // continue with session fallback below
  }

  // Fallback for occasional getUser() false negatives in middleware.
  if (!user) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        user = data.session.user;
      }
    } catch (e) {
      // ignore and handle via route-specific logic below
    }
  }

  // 2. Check maintenance mode with caching
  const maintenanceCacheKey = 'maintenance_mode';
  let maintenanceMode = getCached<boolean>(maintenanceCacheKey);

  if (maintenanceMode === null) {
    try {
      const { data: settings } = await supabase
        .from('site_settings')
        .select('maintenance_mode')
        .eq('id', 'main')
        .single();
      maintenanceMode = settings?.maintenance_mode || false;
      setCache(maintenanceCacheKey, maintenanceMode, 5 * 60 * 1000); // Cache for 5 minutes
    } catch (e) {
      maintenanceMode = false; // Default to false on error
    }
  }

  if (maintenanceMode) {
    // Check if user is admin (with caching)
    let isAdmin = false;

    if (user) {
      const adminCacheKey = `admin_${user.id}`;
      let cachedAdmin = getCached<boolean>(adminCacheKey);

      if (cachedAdmin === null) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          isAdmin = profile?.role === 'admin';
          setCache(adminCacheKey, isAdmin, 2 * 60 * 1000); // Cache for 2 minutes
        } catch (e) {
          isAdmin = false;
        }
      } else {
        isAdmin = cachedAdmin;
      }
    }

    // If not admin, redirect to maintenance page
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // Protect /review route (User must be logged in to write a review)
  if (!user && request.nextUrl.pathname.startsWith('/review')) {
    return NextResponse.redirect(new URL('/login?next=/review', request.url));
  }

  // Detect Supabase auth cookies to mitigate middleware false negatives.
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('-auth-token'));

  // Protect /admin route (must be authenticated before role checks).
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    // If auth cookies exist, let server-side admin guard do the final check.
    // This avoids redirect loops caused by occasional middleware auth misses.
    if (hasSupabaseAuthCookie) {
      return supabaseResponse;
    }
    const next = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  // If unauthenticated and not in maintenance mode, stop here and allow public access
  if (!user) {
    return supabaseResponse;
  }

  // PROTECTED ROUTES LOGIC
  // Check role-based access for /admin and /dashboard
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/dashboard')) {
    // Fetch user role, business_id with caching
    const profileCacheKey = `profile_${user.id}`;
    let roleData = getCached<{ role: string; business_id: string | null }>(profileCacheKey);

    if (!roleData) {
      try {
        const { data, error: roleError } = await supabase
          .from('profiles')
          .select('role, business_id')
          .eq('id', user.id)
          .single();

        if (!roleError && data) {
          roleData = data;
          setCache(profileCacheKey, roleData, 2 * 60 * 1000); // Cache for 2 minutes
        }
      } catch (e) {
        // Fail closed for admin routes if profile verification fails.
        if (request.nextUrl.pathname.startsWith('/admin')) {
          const next = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
          return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
        }
        return supabaseResponse;
      }
    }

    if (!roleData) {
      // User doesn't exist in profiles table or connection failed
      if (request.nextUrl.pathname.startsWith('/admin')) {
        const next = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
      }
      return supabaseResponse;
    }

    // Admin route protection
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (roleData?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Dashboard route protection (pro user)
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      // Skip pro check for status and subscription pages
      if (request.nextUrl.pathname === '/dashboard/pending' ||
        request.nextUrl.pathname === '/dashboard/premium') {
        return supabaseResponse;
      }

      // If profile check fails or is missing pro info, check claims as fallback
      if (!roleData || !roleData.business_id || roleData.role !== 'pro') {
        // Check for approved claim (with caching)
        const claimCacheKey = `claim_approved_${user.id}`;
        let approvedClaim = getCached<{ business_id: string }>(claimCacheKey);

        if (!approvedClaim) {
          const { data } = await supabase
            .from('business_claims')
            .select('business_id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();

          if (data) {
            approvedClaim = data;
            setCache(claimCacheKey, approvedClaim, 5 * 60 * 1000); // Cache for 5 minutes
          }
        }

        if (approvedClaim) {
          // User has approved claim → allow access
          return supabaseResponse;
        }

        // If user role is 'user', check if they have a pending claim
        if (roleData?.role === 'user') {
          const pendingClaimCacheKey = `claim_pending_${user.id}`;
          let pendingClaim = getCached<{ id: string }>(pendingClaimCacheKey);

          if (!pendingClaim) {
            const { data } = await supabase
              .from('business_claims')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'pending')
              .maybeSingle();

            if (data) {
              pendingClaim = data;
              setCache(pendingClaimCacheKey, pendingClaim, 2 * 60 * 1000);
            }
          }

          if (pendingClaim) {
            return NextResponse.redirect(new URL('/dashboard/pending', request.url));
          }
        }

        // No valid pro access or pending claim
        return NextResponse.redirect(new URL('/pour-les-pros', request.url));
      }
    }
  }

  return supabaseResponse;
}




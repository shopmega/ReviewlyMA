import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type RouteProfile = {
  role: string;
  business_id: string | null;
};

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith('sb-'));
}

async function getAuthenticatedUser(supabase: ReturnType<typeof createServerClient>) {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return user;
    }
  } catch {
    // Fall back to session lookup below.
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (!error && session?.user) {
      return session.user;
    }
  } catch {
    // Leave unauthenticated.
  }

  return null;
}

async function getProfile(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<RouteProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, business_id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as RouteProfile;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isGeneralReviewRoute = pathname.startsWith('/review');
  const isBusinessReviewRoute = /^\/businesses\/[^/]+\/review\/?$/.test(pathname);
  const routeRequiresAuth =
    isAdminRoute ||
    isDashboardRoute ||
    isGeneralReviewRoute ||
    isBusinessReviewRoute;

  const makeNextResponse = () =>
    NextResponse.next({
      request: requestHeaders ? { headers: requestHeaders } : request,
    });

  let supabaseResponse = makeNextResponse();

  const withAdminDebug = (response: NextResponse, reason: string) => {
    if (isAdminRoute) {
      response.headers.set('x-admin-debug', reason);
    }
    return response;
  };

  if (pathname === '/maintenance') {
    return withAdminDebug(supabaseResponse, 'skip_maintenance_page');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = makeNextResponse();
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  let maintenanceMode = false;
  try {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('maintenance_mode')
      .eq('id', 'main')
      .single();

    maintenanceMode = Boolean(settings?.maintenance_mode);
  } catch {
    maintenanceMode = false;
  }

  if (!maintenanceMode && !routeRequiresAuth && !hasSupabaseAuthCookies(request)) {
    return withAdminDebug(supabaseResponse, 'public_passthrough_no_auth');
  }

  const user = await getAuthenticatedUser(supabase);

  if (maintenanceMode) {
    if (!user) {
      return withAdminDebug(NextResponse.redirect(new URL('/maintenance', request.url)), 'maintenance_redirect_no_user');
    }

    const adminProfile = await getProfile(supabase, user.id);
    if (adminProfile?.role !== 'admin') {
      return withAdminDebug(NextResponse.redirect(new URL('/maintenance', request.url)), 'maintenance_redirect');
    }
  }

  if (!user && (isGeneralReviewRoute || isBusinessReviewRoute || isAdminRoute || isDashboardRoute)) {
    const next = encodeURIComponent(`${request.nextUrl.pathname}${request.nextUrl.search}`);
    return isAdminRoute
      ? withAdminDebug(NextResponse.redirect(new URL(`/login?next=${next}`, request.url)), 'admin_no_user_redirect_login')
      : NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  if (!user && !routeRequiresAuth) {
    return withAdminDebug(supabaseResponse, 'public_no_user_passthrough');
  }

  if (!isAdminRoute && !isDashboardRoute) {
    return withAdminDebug(supabaseResponse, 'authenticated_public_passthrough');
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile) {
    if (isAdminRoute) {
      return withAdminDebug(supabaseResponse, 'admin_roledata_missing_passthrough');
    }
    return supabaseResponse;
  }

  if (isAdminRoute) {
    if (profile.role !== 'admin') {
      return withAdminDebug(NextResponse.redirect(new URL('/dashboard', request.url)), 'admin_role_not_admin_redirect_dashboard');
    }
    return withAdminDebug(supabaseResponse, 'admin_role_admin_allow');
  }

  if (pathname === '/dashboard/pending' || pathname === '/dashboard/premium') {
    return supabaseResponse;
  }

  if (profile.role === 'pro' && profile.business_id) {
    return supabaseResponse;
  }

  try {
    const { data: approvedClaim } = await supabase
      .from('business_claims')
      .select('business_id')
      .eq('user_id', user.id)
      .or('claim_state.eq.verified,status.eq.approved')
      .maybeSingle();

    if (approvedClaim?.business_id) {
      return supabaseResponse;
    }
  } catch {
    return supabaseResponse;
  }

  if (profile.role === 'user') {
    try {
      const { data: pendingClaim } = await supabase
        .from('business_claims')
        .select('id')
        .eq('user_id', user.id)
        .or('claim_state.eq.verification_pending,status.eq.pending')
        .maybeSingle();

      if (pendingClaim?.id) {
        return NextResponse.redirect(new URL('/dashboard/pending', request.url));
      }
    } catch {
      return supabaseResponse;
    }
  }

  return NextResponse.redirect(new URL('/pro', request.url));
}

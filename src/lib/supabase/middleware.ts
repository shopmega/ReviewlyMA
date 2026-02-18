
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const withAdminDebug = (response: NextResponse, reason: string) => {
        if (isAdminRoute) {
            response.headers.set('x-admin-debug', reason);
        }
        return response;
    };

    // Do not run Supabase code on static assets
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.') ||
        request.nextUrl.pathname.startsWith('/api')
    ) {
        return withAdminDebug(supabaseResponse, 'skip_static_or_api');
    }

    // Skip middleware for maintenance page itself
    if (request.nextUrl.pathname === '/maintenance') {
        return withAdminDebug(supabaseResponse, 'skip_maintenance_page');
    }

    // 1. Refresh session if expired with timeout resilience
    let user = null;
    try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!userError && data?.user) {
            user = data.user;
        }
    } catch (e) {
        console.error('Middleware: Auth connection timeout');
        return supabaseResponse;
    }

    // If auth.getUser failed or no user, stop here
    if (!user) {
        return supabaseResponse;
    }

    // 2. Check maintenance mode with timeout resilience
    let maintenanceMode = false;
    try {
        const { data: settings } = await supabase
            .from('site_settings')
            .select('maintenance_mode')
            .eq('id', 'main')
            .single();
        maintenanceMode = settings?.maintenance_mode || false;
    } catch (e) {
        console.error('Middleware: Settings connection timeout');
    }

    if (maintenanceMode) {
        // Check if user is admin
        let isAdmin = false;
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            isAdmin = profile?.role === 'admin';
        } catch (e) {}

        // If not admin, redirect to maintenance page
        if (!isAdmin) {
            return withAdminDebug(NextResponse.redirect(new URL('/maintenance', request.url)), 'maintenance_redirect');
        }
    }

    // PROTECTED ROUTES LOGIC
    const hasSupabaseAuthCookie = request.cookies
        .getAll()
        .some((cookie) => cookie.name.includes('-auth-token'));

    if (!user && request.nextUrl.pathname.startsWith('/admin')) {
        if (hasSupabaseAuthCookie) {
            return withAdminDebug(supabaseResponse, 'admin_no_user_but_cookie_passthrough');
        }
        const next = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
        return withAdminDebug(NextResponse.redirect(new URL(`/login?next=${next}`, request.url)), 'admin_no_user_redirect_login');
    }

    // Check role-based access for /admin and /dashboard
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/dashboard')) {
        // Fetch user role, business_id
        let roleData = null;
        try {
            const { data, error: roleError } = await supabase
                .from('profiles')
                .select('role, business_id')
                .eq('id', user.id)
                .single();
            
            if (!roleError) {
                roleData = data;
            }
        } catch (e) {
            // Let server-side admin verification decide for admin routes.
            if (request.nextUrl.pathname.startsWith('/admin')) {
                return withAdminDebug(supabaseResponse, 'admin_profile_query_exception_passthrough');
            }
        }

        if (!roleData) {
            // Let server-side admin verification decide for admin routes.
            if (request.nextUrl.pathname.startsWith('/admin')) {
                return withAdminDebug(supabaseResponse, 'admin_roledata_missing_passthrough');
            }
            // Allow them to try to load the page if it's a transient network error
            // Otherwise they get stuck in a redirect loop during downtime
            return supabaseResponse; 
        }

        // Admin route protection
        if (request.nextUrl.pathname.startsWith('/admin')) {
            if (roleData?.role !== 'admin') {
                return withAdminDebug(NextResponse.redirect(new URL('/dashboard', request.url)), 'admin_role_not_admin_redirect_dashboard');
            }
            return withAdminDebug(supabaseResponse, 'admin_role_admin_allow');
        }

        // Dashboard route protection (pro user)
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            // Skip pending page check for pending status page itself
            if (request.nextUrl.pathname === '/dashboard/pending') {
                return supabaseResponse;
            }

            // Fetch profile if not already available (though roleData was fetched above)
            // If profile check fails or is missing pro info, check claims as fallback
            if (!roleData || !roleData.business_id || roleData.role !== 'pro') {
                // Fallback: Check for approved claim
                const { data: approvedClaim } = await supabase
                    .from('business_claims')
                    .select('business_id, status')
                    .eq('user_id', user.id)
                    .eq('status', 'approved')
                    .maybeSingle();

                if (approvedClaim) {
                    // User has approved claim → allow access
                    // The client-side hook (useBusinessProfile) will handle background sync
                    return supabaseResponse;
                }

                // If user role is 'user', check if they have a pending claim to show pending page
                if (roleData?.role === 'user') {
                    const { data: pendingClaim } = await supabase
                        .from('business_claims')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('status', 'pending')
                        .maybeSingle();
                    
                    if (pendingClaim) {
                        return NextResponse.redirect(new URL('/dashboard/pending', request.url));
                    }
                }

                // No valid pro access or pending claim
                return NextResponse.redirect(new URL('/pour-les-pros', request.url));
            }
        }
    }

    return withAdminDebug(supabaseResponse, 'default_passthrough')
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a server-side Supabase client with the service role key.
 * CRITICAL: This bypasses Row Level Security (RLS). Use only in server-side admin code.
 */
export async function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a server-side Supabase client using the current user's cookies.
 * This respects RLS policies.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Can be ignored if handled by middleware
          }
        },
      },
    }
  );
}

/**
 * Server-side check to verify if the current user is an administrator.
 * Returns the user ID if authorized, otherwise throws an error.
 */
export async function verifyAdminSession() {
  const authClient = await createAuthClient();
  let user: { id: string } | null = null;

  const {
    data: { user: authUser },
    error: authError,
  } = await authClient.auth.getUser();

  if (!authError && authUser) {
    user = authUser;
  } else {
    // Fallback for occasional getUser() false negatives in server rendering:
    // use the cookie session user if present.
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (!sessionError && session?.user) {
      user = session.user;
    }
  }

  if (!user) {
    throw new Error('Non autorise: session invalide.');
  }

  // Use service-role client for role lookup to avoid RLS recursion issues.
  const adminClient = await createAdminClient();
  const { data: profiles, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .limit(1);

  if (profileError) {
    console.error('Admin verification profile error:', profileError);
    throw new Error(`Non autorise: impossible de verifier le profil (${profileError.message})`);
  }

  const profile = profiles?.[0];

  if (!profile) {
    throw new Error('Non autorise: profil introuvable. Veuillez vous reconnecter.');
  }

  if (profile.role !== 'admin') {
    throw new Error(`Non autorise: role '${profile.role}' insuffisant. Acces reserve aux administrateurs.`);
  }

  return user.id;
}

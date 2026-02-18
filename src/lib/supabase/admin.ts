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
  let user: any = null;

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

  const metadataRole = String(user?.app_metadata?.role || '').toLowerCase();

  // Primary check: read the current user's profile through auth client (RLS-safe).
  const { data: ownProfile, error: ownProfileError } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!ownProfileError && ownProfile) {
    const ownProfileRole = String(ownProfile.role || '').toLowerCase();
    if (ownProfileRole === 'admin') {
      return user.id;
    }
    if (metadataRole === 'admin') {
      return user.id;
    }
    throw new Error(`Non autorise: role '${ownProfile.role}' insuffisant. Acces reserve aux administrateurs.`);
  }

  // Fallback: service-role lookup (if key exists) for environments where RLS check is unavailable.
  let profile: { role: string } | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = await createAdminClient();
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .limit(1);

    if (profileError) {
      console.error('Admin verification profile error:', profileError);
      if (metadataRole === 'admin') {
        return user.id;
      }
      throw new Error(`Non autorise: impossible de verifier le profil (${profileError.message})`);
    }
    profile = profiles?.[0] || null;
  } else if (ownProfileError) {
    console.error('Admin verification own-profile error (service role unavailable):', ownProfileError);
  }

  if (!profile) {
    if (metadataRole === 'admin') {
      return user.id;
    }
    throw new Error('Non autorise: profil introuvable. Veuillez vous reconnecter.');
  }

  const profileRole = String(profile.role || '').toLowerCase();
  if (profileRole !== 'admin') {
    if (metadataRole === 'admin') {
      return user.id;
    }
    throw new Error(`Non autorise: role '${profile.role}' insuffisant. Acces reserve aux administrateurs.`);
  }

  return user.id;
}

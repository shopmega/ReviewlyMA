import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { AdminPermission, hasAdminPermission } from '@/lib/admin-rbac';

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

function isMissingColumnError(error: any, columnName: string): boolean {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes(columnName.toLowerCase())
    || message.includes('schema cache')
    || String(error.code || '') === '42703'
  );
}

async function readAdminProfile(authClient: any, userId: string) {
  const extended = await authClient
    .from('profiles')
    .select('role, admin_access_level, admin_permissions')
    .eq('id', userId)
    .maybeSingle();

  if (!extended.error) {
    return extended;
  }

  if (isMissingColumnError(extended.error, 'admin_access_level') || isMissingColumnError(extended.error, 'admin_permissions')) {
    return await authClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
  }

  return extended;
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

  // Primary check: read the current user's profile through auth client (RLS-safe).
  const { data: ownProfile, error: ownProfileError } = await readAdminProfile(authClient, user.id);

  if (!ownProfileError && ownProfile) {
    const ownProfileRole = String(ownProfile.role || '').toLowerCase();
    if (ownProfileRole === 'admin') {
      return user.id;
    }
    throw new Error(`Non autorise: role '${ownProfile.role}' insuffisant. Acces reserve aux administrateurs.`);
  }

  // Fallback: service-role lookup (if key exists) for environments where RLS check is unavailable.
  let profile: { role: string; admin_access_level?: string | null; admin_permissions?: string[] | null } | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = await createAdminClient();
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('role, admin_access_level, admin_permissions')
      .eq('id', user.id)
      .limit(1);

    if (profileError && (isMissingColumnError(profileError, 'admin_access_level') || isMissingColumnError(profileError, 'admin_permissions'))) {
      const fallback = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .limit(1);
      if (fallback.error) {
        console.error('Admin verification profile fallback error:', fallback.error);
        throw new Error(`Non autorise: impossible de verifier le profil (${fallback.error.message})`);
      }
      profile = fallback.data?.[0] || null;
    } else {
      if (profileError) {
        console.error('Admin verification profile error:', profileError);
        throw new Error(`Non autorise: impossible de verifier le profil (${profileError.message})`);
      }
      profile = profiles?.[0] || null;
    }
  } else if (ownProfileError) {
    console.error('Admin verification own-profile error (service role unavailable):', ownProfileError);
  }

  if (!profile) {
    throw new Error('Non autorise: profil introuvable. Veuillez vous reconnecter.');
  }

  const profileRole = String(profile.role || '').toLowerCase();
  if (profileRole !== 'admin') {
    throw new Error(`Non autorise: role '${profile.role}' insuffisant. Acces reserve aux administrateurs.`);
  }

  return user.id;
}

export async function verifyAdminPermission(permission: AdminPermission) {
  const adminId = await verifyAdminSession();
  const authClient = await createAuthClient();
  let profile: { role: string; admin_access_level?: string | null; admin_permissions?: string[] | null } | null = null;

  const ownProfile = await readAdminProfile(authClient, adminId);
  if (!ownProfile.error && ownProfile.data) {
    profile = ownProfile.data;
  } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('role, admin_access_level, admin_permissions')
      .eq('id', adminId)
      .maybeSingle();

    if (error && !(isMissingColumnError(error, 'admin_access_level') || isMissingColumnError(error, 'admin_permissions'))) {
      throw new Error(`Non autorise: impossible de verifier les permissions (${error.message})`);
    }

    profile = data || null;
  }

  // Backward-compatible fallback: verified admins without RBAC profile data are treated as super admins.
  if (!profile) {
    profile = { role: 'admin' };
  }

  if (!hasAdminPermission(profile, permission)) {
    throw new Error(`Non autorise: permission '${permission}' requise.`);
  }

  return adminId;
}

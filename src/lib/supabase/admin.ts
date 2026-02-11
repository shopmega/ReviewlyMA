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
                persistSession: false
            }
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
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
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
    const supabase = await createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('Non autorisé: Session invalide.');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Admin verification profile error:', profileError);
        throw new Error(`Non autorisé: Impossible de vérifier le profil (${profileError.message})`);
    }

    if (!profile) {
        throw new Error('Non autorisé: Profil introuvable. Veuillez vous reconnecter.');
    }

    if (profile.role !== 'admin') {
        throw new Error(`Non autorisé: Role '${profile.role}' insuffisant. Accès réservé aux administrateurs.`);
    }

    return user.id;
}

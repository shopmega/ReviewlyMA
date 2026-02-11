/**
 * Enhanced session management for Next.js application
 * Provides caching for user sessions, profile data, and role-based access control
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { cache } from 'react';

// Session cache key prefix
const SESSION_CACHE_PREFIX = 'session_';

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

interface SessionData {
  user: any;
  profile: any;
  role: string;
  permissions: string[];
  expiresAt: number;
  lastChecked: number;
}

// In-memory session cache (use Redis in production)
const sessionCache = new Map<string, SessionData>();

/**
 * Create Supabase client with proper cookie handling
 */
export async function createSupabaseClient() {
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
          } catch {}
        },
      },
    }
  );
}

/**
 * Get current session with caching
 */
export const getCurrentSession = cache(async (): Promise<SessionData | null> => {
  const supabase = await createSupabaseClient();
  
  // Get user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Create cache key
  const cacheKey = `${SESSION_CACHE_PREFIX}${user.id}`;
  
  // Check if session is cached and not expired
  const cachedSession = sessionCache.get(cacheKey);
  const now = Date.now();
  
  if (cachedSession && (now - cachedSession.lastChecked) < SESSION_TIMEOUT) {
    return cachedSession;
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, business_id, is_premium, created_at')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }

  // Create session data
  const sessionData: SessionData = {
    user,
    profile,
    role: profile?.role || 'user',
    permissions: getPermissionsForRole(profile?.role || 'user'),
    expiresAt: now + SESSION_TIMEOUT,
    lastChecked: now,
  };

  // Cache the session
  sessionCache.set(cacheKey, sessionData);

  return sessionData;
});

/**
 * Get permissions based on role
 */
function getPermissionsForRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    user: ['read:own', 'create:review'],
    pro: ['read:own', 'create:review', 'read:business', 'update:business', 'read:analytics'],
    admin: ['read:own', 'create:review', 'read:business', 'update:business', 'read:analytics', 'manage:users', 'manage:content', 'manage:claims'],
  };

  return permissions[role] || permissions.user;
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getCurrentSession();
  
  if (!session) {
    return false;
  }

  return session.permissions.includes(permission) || 
         session.permissions.includes('*') || // wildcard permission
         session.role === 'admin'; // admins have all permissions
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.role === 'admin' || false;
}

/**
 * Check if user is pro
 */
export async function isPro(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.role === 'pro' || session?.role === 'admin' || false;
}

/**
 * Check if user is premium
 */
export async function isPremium(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.profile?.is_premium || false;
}

/**
 * Get user profile with caching
 */
export async function getUserProfile(): Promise<any | null> {
  const session = await getCurrentSession();
  return session?.profile || null;
}

/**
 * Get user ID
 */
export async function getUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id || null;
}

/**
 * Check if user owns a specific business
 */
export async function ownsBusiness(businessId: string): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.profile?.business_id === businessId;
}

/**
 * Invalidate user session cache
 */
export async function invalidateUserSession(userId: string): Promise<void> {
  const cacheKey = `${SESSION_CACHE_PREFIX}${userId}`;
  sessionCache.delete(cacheKey);
}

/**
 * Refresh session data
 */
export async function refreshSession(): Promise<SessionData | null> {
  const session = await getCurrentSession();
  
  if (session) {
    await invalidateUserSession(session.user.id);
    return await getCurrentSession();
  }
  
  return null;
}

/**
 * Validate session and return session data
 */
export async function validateSession(): Promise<{ isValid: boolean; session?: SessionData }> {
  const session = await getCurrentSession();
  
  if (!session) {
    return { isValid: false };
  }

  // Check if session is still valid by checking if user exists in DB
  const supabase = await createSupabaseClient();
  const { data: dbUser, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (error || !dbUser) {
    // User doesn't exist in DB, invalidate cache
    await invalidateUserSession(session.user.id);
    return { isValid: false };
  }

  return { 
    isValid: true, 
    session 
  };
}

/**
 * Get session with validation
 */
export async function getSessionWithValidation(): Promise<SessionData | null> {
  const { isValid, session } = await validateSession();
  return (isValid && session) ? session : null;
}

/**
 * Clear expired sessions from cache
 */
export function clearExpiredSessions(): void {
  const now = Date.now();
  for (const [key, session] of sessionCache.entries()) {
    if (now - session.lastChecked > SESSION_TIMEOUT) {
      sessionCache.delete(key);
    }
  }
}

// Run cleanup periodically
setInterval(clearExpiredSessions, 5 * 60 * 1000); // Every 5 minutes

/**
 * Session utilities
 */
export const sessionUtils = {
  getCurrentSession,
  hasPermission,
  isAdmin,
  isPro,
  isPremium,
  getUserProfile,
  getUserId,
  ownsBusiness,
  invalidateUserSession,
  refreshSession,
  validateSession,
  getSessionWithValidation,
  clearExpiredSessions,
  createSupabaseClient,
};

export default sessionUtils;
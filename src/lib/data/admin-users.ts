import { createClient } from '@/lib/supabase/client';

export interface AdminUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_premium?: boolean;
  avatar_url: string | null;
  created_at: string;
  suspended?: boolean;
}

export interface AdminUserStats {
  totalUsers: number;
  premiumUsers: number;
  proUsers: number;
  suspendedUsers: number;
}

export async function fetchAdminUsers({
  searchQuery,
  filterRole,
  filterStatus,
  rangeFrom,
  rangeTo,
}: {
  searchQuery: string;
  filterRole: string;
  filterStatus: string;
  rangeFrom: number;
  rangeTo: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const q = searchQuery.trim();
  if (q) {
    const safeQ = q.replace(/,/g, ' ');
    query = query.or(`full_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%`);
  }

  if (filterRole !== 'all') {
    query = query.eq('role', filterRole);
  }

  if (filterStatus === 'suspended') {
    query = query.eq('suspended', true);
  } else if (filterStatus === 'active') {
    query = query.or('suspended.is.null,suspended.eq.false');
  }

  const { data, error, count } = await query.range(rangeFrom, rangeTo);

  return {
    data: (data || []) as AdminUserProfile[],
    count: count || 0,
    error,
  };
}

export async function fetchAdminUserStats(): Promise<AdminUserStats> {
  const supabase = createClient();
  const [allUsers, premiumUsers, proUsers, suspendedUsers] = await Promise.all([
    supabase.from('profiles').select('id', { head: true, count: 'exact' }),
    supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('is_premium', true),
    supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'pro'),
    supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('suspended', true),
  ]);

  return {
    totalUsers: allUsers.count || 0,
    premiumUsers: premiumUsers.count || 0,
    proUsers: proUsers.count || 0,
    suspendedUsers: suspendedUsers.count || 0,
  };
}

import { createClient } from '@/lib/supabase/client';

export type AdminPayment = {
  id: string;
  user_id: string;
  business_id: string | null;
  payment_reference: string;
  payment_method: string;
  amount_usd: number | null;
  currency: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  notes: string | null;
  target_tier: 'growth' | 'gold' | null;
  created_at: string;
  expires_at: string | null;
  profiles: { email: string; full_name: string | null };
  businesses: { name: string } | null;
};

export type AdminPaymentStats = {
  pendingCount: number;
  totalRevenue: number;
};

export async function fetchAdminPayments({
  searchQuery,
  statusFilter,
  rangeFrom,
  rangeTo,
}: {
  searchQuery: string;
  statusFilter: string;
  rangeFrom: number;
  rangeTo: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('premium_payments')
    .select(
      `
        *,
        profiles:user_id(email, full_name),
        businesses:business_id(name)
      `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const q = searchQuery.trim();
  if (q) {
    const safeQ = q.replace(/,/g, ' ');
    query = query.or(`payment_reference.ilike.%${safeQ}%`);
  }

  const { data, error, count } = await query.range(rangeFrom, rangeTo);

  return {
    data: (data || []) as unknown as AdminPayment[],
    count: count || 0,
    error,
  };
}

export async function fetchAdminPaymentStats(): Promise<AdminPaymentStats> {
  const supabase = createClient();

  const [pending, verified] = await Promise.all([
    supabase
      .from('premium_payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('premium_payments')
      .select('amount_usd')
      .eq('status', 'verified'),
  ]);

  const revenue = ((verified.data || []) as Array<{ amount_usd: number | null }>).reduce(
    (acc, current) => acc + (current.amount_usd || 0),
    0,
  );

  return {
    pendingCount: pending.count || 0,
    totalRevenue: revenue,
  };
}

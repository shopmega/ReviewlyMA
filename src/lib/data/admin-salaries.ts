import { createClient } from '@/lib/supabase/client';

export type AdminSalaryRow = {
  id: number;
  business_id: string;
  job_title: string;
  salary: number;
  pay_period: 'monthly' | 'yearly';
  employment_type: string;
  department: string | null;
  status: 'pending' | 'published' | 'rejected';
  moderation_notes: string | null;
  created_at: string;
  businesses: { name: string }[] | null;
};

export type AdminSalaryStats = {
  total: number;
  pending: number;
  published: number;
  rejected: number;
  avgSalary: number;
};

export async function fetchAdminSalaries({
  searchQuery,
  statusFilter,
  rangeFrom,
  rangeTo,
}: {
  searchQuery: string;
  statusFilter: 'all' | 'pending' | 'published' | 'rejected';
  rangeFrom: number;
  rangeTo: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('salaries')
    .select(
      'id,business_id,job_title,salary,pay_period,employment_type,department,status,moderation_notes,created_at,businesses(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const q = searchQuery.trim();
  if (q) {
    const safeQ = q.replace(/,/g, ' ');
    query = query.or(`job_title.ilike.%${safeQ}%,department.ilike.%${safeQ}%`);
  }

  const { data, error, count } = await query.range(rangeFrom, rangeTo);

  return {
    data: (data || []) as AdminSalaryRow[],
    count: count || 0,
    error,
  };
}

export async function fetchAdminSalaryStats(): Promise<AdminSalaryStats> {
  const supabase = createClient();
  const [all, pending, published, rejected, salaryData] = await Promise.all([
    supabase.from('salaries').select('id', { count: 'exact', head: true }),
    supabase.from('salaries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('salaries').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('salaries').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('salaries').select('salary').eq('status', 'published'),
  ]);

  const salaries = (salaryData.data || []) as { salary: number }[];
  const avgSalary = salaries.length
    ? Math.round(salaries.reduce((accumulator, row) => accumulator + Number(row.salary), 0) / salaries.length)
    : 0;

  return {
    total: all.count || 0,
    pending: pending.count || 0,
    published: published.count || 0,
    rejected: rejected.count || 0,
    avgSalary,
  };
}

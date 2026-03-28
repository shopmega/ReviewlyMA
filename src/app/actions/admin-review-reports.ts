'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';

export type AdminReviewReport = {
  id: string;
  review_id: number;
  business_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  is_read: boolean;
  created_at: string;
  businesses?: { name: string; slug?: string | null } | null;
};

export async function getAdminReviewReports(filterStatus: 'pending' | 'all'): Promise<AdminReviewReport[]> {
  await verifyAdminPermission('moderation.report.bulk');
  const supabase = await createAdminClient();

  let query = supabase
    .from('review_reports')
    .select('*, businesses(name, slug)');

  if (filterStatus === 'pending') {
    query = query.eq('status', 'pending');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Erreur chargement signalements avis: ${error.message}`);
  }

  const reports = (data || []) as AdminReviewReport[];
  const unreadIds = reports.filter((report) => !report.is_read).map((report) => report.id);
  if (unreadIds.length > 0) {
    await supabase.from('review_reports').update({ is_read: true }).in('id', unreadIds);
    revalidatePath('/admin/avis-signalements');
    return reports.map((report) => unreadIds.includes(report.id) ? { ...report, is_read: true } : report);
  }

  return reports;
}

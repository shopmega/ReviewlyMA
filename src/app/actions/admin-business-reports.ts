'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';

export type AdminBusinessReport = {
  id: string;
  business_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  businesses?: { name: string; slug?: string | null } | null;
};

export async function getAdminBusinessReports(filterStatus: 'pending' | 'all'): Promise<AdminBusinessReport[]> {
  await verifyAdminPermission('moderation.report.bulk');
  const supabase = await createAdminClient();

  let query = supabase
    .from('business_reports')
    .select('id,business_id,reporter_id,reason,details,status,admin_notes,created_at,businesses(name,slug)');

  if (filterStatus === 'pending') {
    query = query.eq('status', 'pending');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Erreur chargement signalements etablissements: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    ...row,
    businesses: Array.isArray(row.businesses) ? (row.businesses[0] ?? null) : row.businesses ?? null,
  })) as AdminBusinessReport[];
}

export async function resolveAdminBusinessReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes?: string | null,
): Promise<{ status: 'success' | 'error'; message: string }> {
  const adminId = await verifyAdminPermission('moderation.report.bulk');
  const supabase = await createAdminClient();

  const { data: report, error: reportError } = await supabase
    .from('business_reports')
    .select('id,business_id,status,businesses(slug)')
    .eq('id', reportId)
    .maybeSingle();

  if (reportError || !report) {
    return { status: 'error', message: `Signalement introuvable: ${reportError?.message || 'not found'}` };
  }

  const { error: updateError } = await supabase
    .from('business_reports')
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (updateError) {
    return { status: 'error', message: updateError.message };
  }

  await logAuditAction({
    adminId,
    action: 'BUSINESS_REPORT_RESOLVED',
    targetType: 'business_report',
    targetId: reportId,
    details: {
      next_status: status,
      business_id: report.business_id,
      admin_notes: adminNotes || null,
    },
  });

  revalidatePath('/admin/entreprises-signalements');
  revalidatePath('/admin/moderation');
  if ((report.businesses as any)?.slug) {
    revalidatePath(`/businesses/${(report.businesses as any).slug}`);
  }

  return {
    status: 'success',
    message: status === 'resolved' ? 'Signalement marque comme traite.' : 'Signalement rejete.',
  };
}

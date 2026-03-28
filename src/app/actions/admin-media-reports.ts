'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { extractStoragePath, parsePostgresArray } from '@/lib/data';
import { logAuditAction } from '@/lib/audit-logger';

export type AdminMediaReport = {
  id: string;
  media_url: string;
  media_type: string;
  business_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'removed' | 'dismissed';
  created_at: string;
  businesses?: { name: string; slug?: string | null };
};

export async function getAdminMediaReports(): Promise<AdminMediaReport[]> {
  await verifyAdminPermission('moderation.report.bulk');
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('media_reports')
    .select('*, businesses(name, slug)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur chargement signalements media: ${error.message}`);
  }

  return (data || []) as AdminMediaReport[];
}

export async function resolveAdminMediaReport(
  reportId: string,
  status: 'removed' | 'dismissed'
): Promise<{ status: 'success' | 'error'; message: string }> {
  const adminId = await verifyAdminPermission('moderation.report.bulk');
  const supabase = await createAdminClient();

  const { data: report, error: reportError } = await supabase
    .from('media_reports')
    .select('id, media_url, business_id, status, businesses(name, slug)')
    .eq('id', reportId)
    .maybeSingle();

  if (reportError || !report) {
    return { status: 'error', message: `Signalement introuvable: ${reportError?.message || 'not found'}` };
  }

  if (status === 'removed') {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, slug, logo_url, cover_url, gallery_urls')
      .eq('id', report.business_id)
      .maybeSingle();

    if (businessError) {
      return { status: 'error', message: `Erreur chargement etablissement: ${businessError.message}` };
    }

    if (business) {
      const updateData: Record<string, unknown> = {};
      let changed = false;

      if (business.logo_url === report.media_url) {
        updateData.logo_url = null;
        changed = true;
      } else if (business.cover_url === report.media_url) {
        updateData.cover_url = null;
        changed = true;
      } else {
        const currentGallery = parsePostgresArray((business as any).gallery_urls);
        if (currentGallery.includes(report.media_url)) {
          updateData.gallery_urls = currentGallery.filter((url: string) => url !== report.media_url);
          changed = true;
        }
      }

      if (changed) {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', report.business_id);

        if (updateError) {
          return { status: 'error', message: `Erreur mise a jour media etablissement: ${updateError.message}` };
        }
      }

      const path = extractStoragePath(report.media_url);
      if (path) {
        const { error: storageError } = await supabase.storage.from('business-images').remove([path]);
        if (storageError) {
          return { status: 'error', message: `Erreur suppression stockage: ${storageError.message}` };
        }
      }
    }
  }

  const { error: resolveError } = await supabase
    .from('media_reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', reportId);

  if (resolveError) {
    return { status: 'error', message: resolveError.message };
  }

  await logAuditAction({
    adminId,
    action: 'MEDIA_REPORT_RESOLVED',
    targetType: 'media_report',
    targetId: reportId,
    details: {
      next_status: status,
      business_id: report.business_id,
      media_url: report.media_url,
    },
  });

  revalidatePath('/admin/contenu');
  revalidatePath('/admin/moderation');
  if ((report.businesses as any)?.slug) {
    revalidatePath(`/businesses/${(report.businesses as any).slug}`);
  }

  return {
    status: 'success',
    message: status === 'removed' ? 'Media supprime du site.' : 'Signalement rejete.',
  };
}

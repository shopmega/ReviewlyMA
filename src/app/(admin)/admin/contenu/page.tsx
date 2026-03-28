import { verifyAdminPermission } from '@/lib/supabase/admin';
import { getAdminMediaReports } from '@/app/actions/admin-media-reports';
import MediaReportsPageClient from './MediaReportsPageClient';

export default async function MediaReportsPage() {
  await verifyAdminPermission('moderation.report.bulk');
  const initialReports = await getAdminMediaReports();

  return <MediaReportsPageClient initialReports={initialReports} />;
}

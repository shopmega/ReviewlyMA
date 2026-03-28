import { verifyAdminPermission } from '@/lib/supabase/admin';
import { getAdminBusinessReports } from '@/app/actions/admin-business-reports';
import BusinessReportsPageClient from './BusinessReportsPageClient';

export default async function BusinessReportsPage() {
  await verifyAdminPermission('moderation.report.bulk');
  const initialReports = await getAdminBusinessReports('pending');

  return <BusinessReportsPageClient initialReports={initialReports} initialFilterStatus="pending" />;
}

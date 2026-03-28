import { verifyAdminPermission } from '@/lib/supabase/admin';
import { getAdminReviewReports } from '@/app/actions/admin-review-reports';
import ReviewReportsPageClient from './ReviewReportsPageClient';

export default async function ReviewReportsPage() {
  await verifyAdminPermission('moderation.report.bulk');
  const initialReports = await getAdminReviewReports('pending');

  return <ReviewReportsPageClient initialReports={initialReports} initialFilterStatus="pending" />;
}

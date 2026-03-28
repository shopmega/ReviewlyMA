import { verifyAdminPermission } from '@/lib/supabase/admin';
import AnalyticsPageClient from './AnalyticsPageClient';

export default async function AnalyticsPage() {
  await verifyAdminPermission('analytics.view');

  return <AnalyticsPageClient />;
}

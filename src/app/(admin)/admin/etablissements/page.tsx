import { verifyAdminPermission } from '@/lib/supabase/admin';
import BusinessesAdminPageClient from './BusinessesAdminPageClient';

export default async function BusinessesAdminPage() {
  await verifyAdminPermission('business.manage');

  return <BusinessesAdminPageClient />;
}

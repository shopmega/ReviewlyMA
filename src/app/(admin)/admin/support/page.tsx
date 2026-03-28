import { verifyAdminPermission } from '@/lib/supabase/admin';
import AdminSupportPageClient from './AdminSupportPageClient';

export default async function AdminSupportPage() {
  await verifyAdminPermission('support.manage');

  return <AdminSupportPageClient />;
}

import { verifyAdminPermission } from '@/lib/supabase/admin';
import UsersPageClient from './UsersPageClient';

export default async function UsersPage() {
  await verifyAdminPermission('user.manage');

  return <UsersPageClient />;
}

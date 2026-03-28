import { verifyAdminPermission } from '@/lib/supabase/admin';
import PaiementsPageClient from './PaiementsPageClient';

export default async function PaiementsPage() {
  await verifyAdminPermission('payment.manage');

  return <PaiementsPageClient />;
}

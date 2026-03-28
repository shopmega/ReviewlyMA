import { getAdminMessages } from '@/app/actions/admin-messages';
import { verifyAdminPermission } from '@/lib/supabase/admin';
import AdminMessagesPageClient from './AdminMessagesPageClient';

export default async function AdminMessagesPage() {
  await verifyAdminPermission('support.manage');
  const initialMessages = await getAdminMessages({ source: 'all', read: 'all' });

  return <AdminMessagesPageClient initialMessages={initialMessages} />;
}

import { verifyAdminPermission } from '@/lib/supabase/admin';
import ClaimsPageClient from './ClaimsPageClient';

export default async function ClaimsPage() {
  await verifyAdminPermission('moderation.claim.review');

  return <ClaimsPageClient />;
}

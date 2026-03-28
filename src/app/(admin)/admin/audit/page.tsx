import { getAdminAuditSnapshot } from '@/app/actions/admin-audit-logs';
import { verifyAdminPermission } from '@/lib/supabase/admin';
import AuditLogsPageClient from './AuditLogsPageClient';

export default async function AuditLogsPage() {
  await verifyAdminPermission('audit.view');
  const snapshot = await getAdminAuditSnapshot();

  return <AuditLogsPageClient initialLogs={snapshot.logs} initialMonthActions={snapshot.monthActions} />;
}

'use server';

import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';

type AuditSource = 'audit_logs' | 'admin_audit_log';

export interface UnifiedAuditLog {
  id: string;
  source: AuditSource;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface AdminAuditSnapshot {
  logs: UnifiedAuditLog[];
  monthActions: number;
}

export async function getAdminAuditSnapshot(): Promise<AdminAuditSnapshot> {
  await verifyAdminPermission('audit.view');
  const supabase = await createAdminClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

  const [
    auditLogsRes,
    adminAuditLogsRes,
    auditMonthCountRes,
    adminAuditMonthCountRes,
  ] = await Promise.all([
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString()),
    supabase
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString()),
  ]);

  if (auditLogsRes.error) {
    throw new Error(`Erreur chargement audit_logs: ${auditLogsRes.error.message}`);
  }
  if (adminAuditLogsRes.error) {
    throw new Error(`Erreur chargement admin_audit_log: ${adminAuditLogsRes.error.message}`);
  }

  const normalizedAuditLogs: UnifiedAuditLog[] = (auditLogsRes.data || []).map((item: any) => ({
    id: item.id,
    source: 'audit_logs',
    admin_id: item.admin_id || null,
    action: item.action,
    target_type: item.target_type || 'unknown',
    target_id: item.target_id || null,
    details: item.details || {},
    created_at: item.created_at,
    profiles: null,
  }));

  const normalizedAdminAuditLogs: UnifiedAuditLog[] = (adminAuditLogsRes.data || []).map((item: any) => ({
    id: item.id,
    source: 'admin_audit_log',
    admin_id: item.admin_id || null,
    action: item.action,
    target_type: item.details?.target_type || item.details?.entity_type || 'bulk_action',
    target_id: item.details?.target_id || null,
    details: item.details || {},
    created_at: item.created_at,
    profiles: null,
  }));

  const merged = [...normalizedAuditLogs, ...normalizedAdminAuditLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const uniqueAdminIds = [...new Set(merged.map((log) => log.admin_id).filter(Boolean) as string[])];
  let profilesMap: Record<string, { id: string; full_name: string; email: string }> = {};

  if (uniqueAdminIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uniqueAdminIds);

    if (profilesError) {
      throw new Error(`Erreur chargement profils audit: ${profilesError.message}`);
    }

    profilesMap = (profiles || []).reduce((acc, profile: any) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, { id: string; full_name: string; email: string }>);
  }

  return {
    monthActions: (auditMonthCountRes.count || 0) + (adminAuditMonthCountRes.count || 0),
    logs: merged.slice(0, 150).map((log) => ({
      ...log,
      profiles: log.admin_id ? profilesMap[log.admin_id] || null : null,
    })),
  };
}
